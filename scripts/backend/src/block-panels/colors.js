import { __ } from '@wordpress/i18n';
import React from 'react';

import { Button, ColorIndicator, ColorPalette, Dropdown, FlexItem, __experimentalHStack as HStack, __experimentalToolsPanelItem as ToolsPanelItem } from '@wordpress/components';

const TRANSPARENT = 'transparent';

const themeColors = Array.isArray(window?.eventkoi_params?.theme_colors)
  ? window.eventkoi_params.theme_colors
  : [];

export const ColorSettingsPane = props => {

  const { colors, attributes, setAttributes } = props;

  return (
    <div className="color-block-support-panel__inner-wrapper">
      {colors.map(function (item, i) {
        var fallbackValue = item.default ? item.default : undefined;
        if (!item.label) {
          return null;
        }
        const stored = attributes[item.value];
        const isTransparent = stored === TRANSPARENT;
        const value = isTransparent ? '' : (stored || '');
        const indicatorValue = isTransparent ? undefined : value;
        return <ToolsPanelItem
          hasValue={() => attributes[item.value] != fallbackValue}
          label={item.label}
          onDeselect={() => setAttributes({ [item.value]: fallbackValue })}
          isShownByDefault
          className={`block-editor-tools-panel-color-gradient-settings__item ${i == 0 && 'first'}`}
          key={`panelItem-${i}`}
        >
          <Dropdown
            className="block-editor-tools-panel-color-gradient-settings__dropdown"
            contentClassName="my-popover-content-classname"
            popoverProps={{ placement: 'left-start', offset: 36 }}
            renderToggle={({ isOpen, onToggle }) => (
              <Button
                onClick={onToggle}
                aria-expanded={isOpen}
                className={isOpen ? 'block-editor-panel-color-gradient-settings__dropdown is-open' : 'block-editor-panel-color-gradient-settings__dropdown'}
              >
                <HStack justify="flex-start">
                  <ColorIndicator className="block-editor-panel-color-gradient-settings__color-indicator" colorValue={indicatorValue} />
                  <FlexItem>{item.label}</FlexItem>
                </HStack>
              </Button>
            )}
            renderContent={() => <div className="components-dropdown-content-wrapper">
              <div className="block-editor-panel-color-gradient-settings__dropdown-content">
                <ColorPalette
                  value={value}
                  colors={themeColors}
                  enableAlpha
                  clearable={!item.required}
                  onChange={(newColor) => {
                    if (!newColor) {
                      if (item.required) {
                        setAttributes({ [item.value]: TRANSPARENT });
                      } else {
                        setAttributes({ [item.value]: undefined });
                      }
                      return;
                    }
                    setAttributes({ [item.value]: newColor });
                  }}
                />
              </div>
            </div>}
          />
        </ToolsPanelItem>
      })}
    </div>
  );

}
