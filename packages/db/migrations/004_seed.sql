-- ShareSkill v2 Seed Data
-- Migration: 004_seed.sql

-- Insert categories
INSERT INTO skill_categories (key, label_en, label_zh, hint_en, hint_zh, sort_order) VALUES
  ('documents', 'Documents & Office', '文档与办公', 'PDF, Word, Excel, PPT processing', 'PDF、Word、Excel、PPT 处理', 45),
  ('workflow', 'Workflow & Automation', '业务流程与自动化', 'Task automation, process management', '任务自动化、流程管理', 70),
  ('design', 'Design & Creative', '设计与创意', 'UI design, image processing, creative tools', 'UI 设计、图像处理、创意工具', 55),
  ('data', 'Data Processing & Analysis', '数据处理与分析', 'Data transformation, analysis, visualization', '数据转换、分析、可视化', 60),
  ('engineering', 'Code & Engineering', '代码与工程化', 'Development tools, code generation, testing', '开发工具、代码生成、测试', 40),
  ('system', 'Tools & System Ops', '工具与系统操作', 'System utilities, DevOps, infrastructure', '系统工具、DevOps、基础设施', 30),
  ('content', 'Content & Communication', '内容与沟通', 'Writing, translation, communication tools', '写作、翻译、沟通工具', 50),
  ('integration', 'Integrations & Connectors', '集成与连接器', 'API integrations, third-party services', 'API 集成、第三方服务', 120),
  ('other', 'Other', '其他', 'Miscellaneous skills', '其他技能', 999)
ON CONFLICT (key) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  label_zh = EXCLUDED.label_zh,
  hint_en = EXCLUDED.hint_en,
  hint_zh = EXCLUDED.hint_zh,
  sort_order = EXCLUDED.sort_order;
