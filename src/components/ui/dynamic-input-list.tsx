
import React from "react";
import { PlusCircle, X } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";

export interface Item {
  value: string;
}

interface DynamicInputListProps {
  items: Item[];
  onChange: (items: Item[]) => void;
  placeholder?: string;
}

export const DynamicInputList: React.FC<DynamicInputListProps> = ({
  items,
  onChange,
  placeholder = "Enter item",
}) => {
  const handleItemChange = (index: number, value: string) => {
    const updatedItems = [...items];
    updatedItems[index].value = value;
    onChange(updatedItems);
  };

  const handleAddItem = () => {
    onChange([...items, { value: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      const updatedItems = [...items];
      updatedItems.splice(index, 1);
      onChange(updatedItems);
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item.value}
            onChange={(e) => handleItemChange(index, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemoveItem(index)}
            disabled={items.length <= 1}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full mt-2"
        onClick={handleAddItem}
      >
        <PlusCircle className="h-4 w-4 mr-2" /> Add Item
      </Button>
    </div>
  );
};
