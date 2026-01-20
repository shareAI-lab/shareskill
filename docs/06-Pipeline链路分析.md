# ShareSkill Pipeline 链路分析

## 一、当前架构总览

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Pipeline 执行流程                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Discover   │ -> │    Fetch     │ -> │   Extract    │ -> │    Embed     │  │
│  │  GitHub搜索   │    │  下载文件     │    │  LLM分析     │    │  生成向量     │  │
│  │  SHA对比     │    │  获取树结构   │    │  安全审查     │    │  OpenAI API  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │                   │          │
│         v                   v                   v                   v          │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                              Load (存储)                                  │  │
│  │   Supabase DB Upsert + Storage 缓存 + refresh_skills_summary()           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 二、各阶段详细分析

### 2.1 Discover (发现阶段)

**目标**：找出需要处理的 Skills

**当前实现**：

```
1. 加载 DB 现有 skills (skillsByKey, bestBySlug)
2. GitHub Code Search: filename:SKILL.md
3. 获取每个 repo 的元数据 (stars, branch)
4. 遍历每个 repo 的文件树，找出 SKILL.md
5. 对比 SHA，确定新增/更新的 skills
6. Fork 去重：保留 stars 最高的版本
```

**输入**：无
**输出**：`DiscoveredSkill[]` (需要处理的列表)

**问题分析**：

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| GitHub Code Search 限制 | 中 | 最多返回 1000 条，大型仓库可能漏掉 |
| 全量扫描效率低 | 中 | 每次都要遍历所有 repo 的文件树 |
| 无删除检测 | 低 | 已删除的 skill 不会从 DB 移除 |

### 2.2 Fetch (获取阶段)

**目标**：下载 skill 的所有文件内容

**当前实现**：

```
1. 获取 SKILL.md 内容
2. 获取 skill 目录的完整文件树
3. 计算相对路径
4. 下载非二进制文件 (max 20个, each <100KB)
5. 分析文件结构 (hasScripts, hasReferences, hasAssets)
```

**输入**：`DiscoveredSkill`
**输出**：`SkillContent` (含 skillMdContent, files[], fileTree)

**问题分析**：

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| 串行下载文件 | 高 | 每个文件单独 API 调用，效率低 |
| GitHub API 调用多 | 中 | 每个 skill 至少 2+ 次 API 调用 |

### 2.3 Extract (提取阶段)

**目标**：解析 frontmatter + LLM 增强 + 安全分析

**当前实现**：

```
1. 解析 SKILL.md frontmatter (name, description)
2. LLM 增强: 提取 tagline, category, tags, features, tech_stack
3. LLM 安全分析: SKILL.md + 最多 10 个文件
4. 构建 searchText, embeddingText
```

**优化后**：所有 LLM 调用并行执行

**输入**：`SkillContent`
**输出**：`ExtractedSkill`

**问题分析**：

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| LLM 调用次数多 | 高 | 每个 skill 最多 12 次 LLM 调用 |
| ~~串行 LLM 调用~~ | ~~高~~ | **已优化**: 改为并行 |

### 2.4 Embed (向量化阶段)

**目标**：生成语义搜索向量

**当前实现**：

```
1. 构建 embeddingText (name + tagline + description + category + tags + features + body preview)
2. 调用 OpenAI text-embedding-3-large
3. 返回 1536 维向量
```

**输入**：`embeddingText`
**输出**：`number[]` (1536d)

**问题分析**：无明显问题，单次 API 调用

### 2.5 Load (存储阶段)

**目标**：写入数据库 + 缓存文件

**当前实现**：

```
1. 构建完整记录 (40+ 字段)
2. Upsert 到 skills 表
3. 上传资源文件到 Supabase Storage (代码/文档类)
4. 最后调用 refresh_skills_summary()
```

**输入**：`ExtractedSkill` + `embedding`
**输出**：无

**问题分析**：

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| Storage MIME 类型限制 | 低 | 已修复，下次生效 |
| 串行上传文件 | 中 | 可并行优化 |

## 三、增量更新机制

### 3.1 当前机制

```
发现阶段：
  - SHA 对比: 只处理 SHA 变化的 skills
  - 新增检测: DB 中不存在的 key

处理阶段：
  - 每个 skill 独立处理，失败不影响其他
  - Upsert 模式：存在则更新，不存在则插入
```

### 3.2 问题

| 场景 | 当前行为 | 理想行为 |
|------|----------|----------|
| Skill 被删除 | 不处理，DB 中保留 | 标记为 deleted 或删除 |
| Repo 被删除/转私有 | 不处理，DB 中保留 | 标记为 unavailable |
| Fork 变成最佳版本 | 不会自动替换 | 应该更新 bestBySlug |

## 四、性能瓶颈分析

### 4.1 时间分布 (单个 Skill)

| 阶段 | 耗时 | 占比 | API 调用 |
|------|------|------|----------|
| Fetch | ~2-5s | 15% | 2-20 GitHub API |
| Extract (LLM) | ~10-30s | 70% | 1-12 LLM API |
| Embed | ~1-2s | 10% | 1 OpenAI API |
| Load | ~1-2s | 5% | 1-20 Supabase API |

**总计**: ~15-40s / skill

### 4.2 瓶颈排序

1. **LLM 调用** (70%) - 已优化为并行
2. **GitHub API 调用** (15%) - 受 rate limit 限制
3. **Supabase 写入** (5%) - 可优化但收益小

### 4.3 优化后预估

| 优化项 | 原耗时 | 新耗时 | 提升 |
|--------|--------|--------|------|
| LLM 并行 (单 skill) | ~20s | ~5s | 4x |
| Skill 并行 (3个) | 15h | 5h | 3x |
| **总体** | ~15h | ~1-2h | 10x |

## 五、建议的优化方案

### 5.1 短期优化 (已实施)

- [x] 单 skill 内 LLM 调用并行
- [x] 多 skill 并行处理 (SKILL_CONCURRENT=3)
- [x] 修复 Storage MIME 类型

### 5.2 中期优化 (建议)

```typescript
// 1. Fetch 阶段文件并行下载
const files = await Promise.all(
  filesToFetch.map(f => fetchFileContent(repo, f.path))
);

// 2. Load 阶段文件并行上传
await Promise.all(
  files.map(f => uploadToStorage(skillKey, f))
);

// 3. 减少安全分析文件数 (10 -> 5)
const filesToAnalyze = sortedFiles.slice(0, 5);
```

### 5.3 长期优化 (架构改进)

#### 方案 A: 分层处理

```
Layer 1: 快速索引 (每小时)
  - 只做 Discover + 基础 Fetch
  - 存储 skill 基本信息
  - 不做 LLM 分析

Layer 2: 深度分析 (每天)
  - 对新增/更新的 skills 做 LLM 增强
  - 生成 embedding

Layer 3: 安全审查 (按需)
  - 用户访问时触发
  - 或定期批量处理
```

#### 方案 B: 事件驱动

```
GitHub Webhook -> Queue -> Worker

优点：
  - 实时发现新 skills
  - 按需处理，减少浪费
  - 可水平扩展

缺点：
  - 需要 Webhook 配置
  - 架构复杂度增加
```

#### 方案 C: 增量索引

```sql
-- 维护 repo 级别的索引状态
CREATE TABLE skill_repositories (
  repo_full_name text PRIMARY KEY,
  last_indexed_at timestamptz,
  last_seen_at timestamptz,
  tree_sha text,  -- 整个 repo 的 tree SHA
  status text     -- active, deleted, private
);

-- 只扫描 tree_sha 变化的 repos
```

## 六、数据一致性保障

### 6.1 当前机制

```
- Upsert 保证幂等性
- 单 skill 原子处理
- 失败跳过不阻塞
- refresh_skills_summary() 定期更新统计
```

### 6.2 建议增强

```sql
-- 1. 添加 deleted_at 字段
ALTER TABLE skills ADD COLUMN deleted_at timestamptz;

-- 2. 添加 last_seen_at 字段 (pipeline 运行时更新)
-- 已存在

-- 3. 定期清理任务
-- 如果 last_checked_at < NOW() - INTERVAL '30 days'，标记为 stale
```

## 七、监控指标建议

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| pipeline_duration_seconds | 总运行时长 | > 2h |
| skills_discovered_count | 发现的 skills 数 | 变化 > 20% |
| skills_failed_count | 处理失败数 | > 10% |
| llm_api_errors | LLM API 错误数 | > 5 |
| github_rate_limit_remaining | GitHub 配额剩余 | < 100 |

## 八、总结

### 当前状态

- **架构合理性**: 8/10 - 分阶段设计清晰，容错性好
- **性能**: 5/10 - LLM 串行是主要瓶颈 (已优化)
- **增量机制**: 7/10 - SHA 对比有效，但缺少删除检测
- **可扩展性**: 6/10 - 单机运行，无水平扩展能力

### 优先级建议

1. **高** - 已实施的并行优化
2. **中** - 减少 LLM 调用次数 (安全分析文件数)
3. **低** - 添加删除检测机制
4. **长期** - 考虑事件驱动架构
