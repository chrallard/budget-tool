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
  return (
    <label className="review-field">
      <span>Category</span>
      <select
        aria-label="Category"
        value={selectedCategory ?? ""}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">Select a category</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>
  );
}