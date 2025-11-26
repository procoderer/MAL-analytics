import React, { useEffect, useState } from "react";

export default function App() {
  const [topLists, setTopLists] = useState<unknown | null>(null);

  useEffect(() => {
    fetch("/api/anime/top-lists")
      .then((res) => res.json())
      .then((data) => setTopLists(data))
      .catch(() => setTopLists({ error: "failed to load" }));
  }, []);

  return (
    <div className="container">
      <h1>MAL Analytics</h1>
      <p>Example endpoint: GET /api/anime/top-lists</p>
      {topLists ? <pre>{JSON.stringify(topLists, null, 2)}</pre> : null}
    </div>
  );
}


