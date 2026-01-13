import Link from "next/link";

export default function CategoryCard({ label, hint, count, countLabel, style, value }) {
  return (
    <Link
      href={`/search?category=${encodeURIComponent(value || label)}`}
      className="category-card fade-up"
      style={style}
    >
      <h3 className="category-title">{label}</h3>
      <p className="category-hint">{hint}</p>
      <div className="category-count">{countLabel || `${count ?? 0}`}</div>
    </Link>
  );
}
