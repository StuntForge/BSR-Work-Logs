"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client-api";

interface AreaItem {
  id: string;
  label: string;
  order: number;
  active: boolean;
}
interface AreaCategory {
  id: string;
  key: string;
  label: string;
  order: number;
  active: boolean;
  items: AreaItem[];
}

export default function AreaOfWorkPage() {
  const [categories, setCategories] = useState<AreaCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemLabel, setNewItemLabel] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch<{ categories: AreaCategory[] }>("/api/committee/area-categories");
    setCategories(data.categories);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleCategoryActive(cat: AreaCategory) {
    await apiFetch(`/api/committee/area-categories/${cat.id}`, { method: "PATCH", body: JSON.stringify({ active: !cat.active }) });
    load();
  }

  async function toggleItemActive(item: AreaItem) {
    await apiFetch(`/api/committee/area-items/${item.id}`, { method: "PATCH", body: JSON.stringify({ active: !item.active }) });
    load();
  }

  async function addItem(cat: AreaCategory) {
    const label = newItemLabel[cat.id]?.trim();
    if (!label) return;
    await apiFetch(`/api/committee/area-categories/${cat.id}/items`, {
      method: "POST",
      body: JSON.stringify({ label, order: cat.items.length + 1 }),
    });
    setNewItemLabel((s) => ({ ...s, [cat.id]: "" }));
    load();
  }

  if (loading) return <p className="muted">Loading...</p>;

  return (
    <div>
      <h1 className="page-title">Area of Work</h1>
      <div className="page-title-underline" />
      <p className="page-subtitle" style={{ marginTop: -18 }}>
        Dynamic A–F taxonomy used across every Work Record. Deactivate rather than delete once a category or item has
        been used historically.
      </p>

      <div className="stack">
        {categories.map((cat) => (
          <div key={cat.id} className="card">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div className="row">
                <strong>
                  {cat.key}. {cat.label}
                </strong>
                <span className={`badge ${cat.active ? "badge-green" : "badge-gray"}`}>{cat.active ? "Active" : "Inactive"}</span>
              </div>
              <button className="btn" onClick={() => toggleCategoryActive(cat)}>
                {cat.active ? "Deactivate category" : "Reactivate category"}
              </button>
            </div>

            <table className="table">
              <tbody>
                {cat.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.label}</td>
                    <td style={{ width: 100 }}>
                      <span className={`badge ${item.active ? "badge-green" : "badge-gray"}`}>{item.active ? "Active" : "Inactive"}</span>
                    </td>
                    <td style={{ width: 140, textAlign: "right" }}>
                      <button className="btn" onClick={() => toggleItemActive(item)}>
                        {item.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="row" style={{ marginTop: 10 }}>
              <input
                className="input"
                placeholder="New item label"
                value={newItemLabel[cat.id] ?? ""}
                onChange={(e) => setNewItemLabel((s) => ({ ...s, [cat.id]: e.target.value }))}
              />
              <button className="btn" onClick={() => addItem(cat)}>
                Add item
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
