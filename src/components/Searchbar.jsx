import { useState } from "react";

function SearchBar({ onSearch }) {
  const [tag, setTag] = useState("");

  return (
    <div>
      <input
        placeholder="Enter player tag"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
      />
      <button 
  onClick={() => tag && onSearch(tag)}
>
  Search
</button>
    </div>
  );
}

export default SearchBar;