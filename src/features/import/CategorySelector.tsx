type CategorySelectorProps = {
  categories: string[];
  selectedCategory?: string;
  onChange: (category: string) => void;
  label?: string;
};

export function CategorySelector({
  categories,
  selectedCategory,
  onChange,
  label = "Category",
}: Readonly<CategorySelectorProps>) {
  const sortedCategories = [...categories].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  return (
    <label className="review-field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={selectedCategory ?? ""}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">Select a category</option>
        {sortedCategories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>
  );
}