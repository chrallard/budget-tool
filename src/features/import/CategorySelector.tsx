type CategorySelectorProps = {
  categories: string[];
  selectedCategory?: string;
  onChange: (category: string) => void;
};

export function CategorySelector({
  categories,
  selectedCategory,
  onChange,
}: Readonly<CategorySelectorProps>) {
  const sortedCategories = [...categories].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  return (
    <label className="review-field">
      <span>Category</span>
      <select
        aria-label="Category"
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