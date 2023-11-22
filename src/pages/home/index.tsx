import { useContext, useState } from "react";
import invariant from "tiny-invariant";
import { CCComponentStore, type CCComponentId } from "../../store/component";
import useAllComponents from "../../store/react/selectors";
import { storeContext, useStore } from "../../store/react";
import CCStore, { type CCStorePropsFromJson } from "../../store";

export type HomePageProps = {
  onComponentSelected: (componentId: CCComponentId) => void;
};

export default function HomePage({ onComponentSelected }: HomePageProps) {
  const store = useStore();
  const { setStore } = useContext(storeContext);
  const components = useAllComponents().filter(
    (component) => !component.isIntrinsic
  );
  const [newComponentName, setNewComponentName] = useState("");
  const downloadStore = () => {
    const storeJSON = store.toJSON();
    const blob = new Blob([storeJSON], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "store.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadStore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const storeJSON = reader.result as string;
      const storeData = JSON.parse(storeJSON);
      const downloadedStore = new CCStore(
        undefined,
        storeData as CCStorePropsFromJson
      );
      invariant(setStore);
      setStore(downloadedStore);
    };
    reader.readAsText(file);
  };

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
          Create!
        </button>
      </form>
      <div>
        <button type="button" onClick={() => downloadStore()}>
          Download
        </button>
      </div>
      <div>
        ファイルをアップロード
        <input type="file" onChange={(e) => uploadStore(e)} />
      </div>
    </div>
  );
}
