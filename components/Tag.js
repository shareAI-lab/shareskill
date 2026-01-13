export default function Tag({ label }) {
  if (!label) {
    return null;
  }
  return <span className="tag">{label}</span>;
}
