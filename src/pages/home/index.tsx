import { useState } from "react";
import { CCComponentStore, type CCComponentId } from "../../store/component";
import useAllComponents from "../../store/react/selectors";
import { useStore } from "../../store/react";

export type HomePageProps = {
  onComponentSelected: (componentId: CCComponentId) => void;
};

export default function HomePage({ onComponentSelected }: HomePageProps) {
  const store = useStore();
  const components = useAllComponents().filter(
    (component) => !component.isIntrinsic
  );
  const [newComponentName, setNewComponentName] = useState("");

  return (
    <div style={{ overflowY: "auto" }}>
      <h1>Home</h1>
      <ul>
        {components.map((component) => (
          <li key={component.id}>
            <button
              type="button"
              onClick={() => onComponentSelected(component.id)}
            >
              {component.name}
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newComponentName) return;
          const newComponent = CCComponentStore.create({
            name: newComponentName,
          });
          store.components.register(newComponent);
          onComponentSelected(newComponent.id);
        }}
      >
        <input
          value={newComponentName}
          onChange={(e) => setNewComponentName(e.target.value)}
          placeholder="New component name"
        />
        <button type="submit" disabled={!newComponentName}>
          Create
        </button>
      </form>
    </div>
  );
}
