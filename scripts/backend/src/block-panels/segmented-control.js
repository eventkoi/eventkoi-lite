import { BaseControl, Button } from "@wordpress/components";
import classnames from "classnames";

/**
 * SegmentedControl — visually matches core "block style" selector,
 * but uses BaseControl for proper label rendering and spacing.
 */
export function SegmentedControl({ label, options, value, onChange }) {
  return (
    <BaseControl label={label} className="eventkoi-segmented-control">
      <div className="block-editor-block-styles">
        <div className="block-editor-block-styles__variants">
          {options.map((opt) => {
            const isActive = value === opt.value;

            return (
              <Button
                key={opt.value}
                isSecondary
                aria-current={isActive}
                aria-label={opt.label}
                onClick={() => onChange(opt.value)}
                className={classnames("block-editor-block-styles__item", {
                  "is-active": isActive,
                })}
              >
                <span className="block-editor-block-styles__item-text">
                  {opt.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </BaseControl>
  );
}
