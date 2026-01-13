import { getStrings, useLanguage } from "../lib/i18n";

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  className = "",
  placeholder,
  buttonLabel
}) {
  const { language } = useLanguage();
  const strings = getStrings(language);
  const resolvedPlaceholder = placeholder || strings.searchPlaceholder;
  const resolvedButtonLabel = buttonLabel || strings.searchButton;
  return (
    <form
      className={`search-bar ${className}`.trim()}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <input
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={resolvedPlaceholder}
      />
      <button type="submit">{resolvedButtonLabel}</button>
    </form>
  );
}
