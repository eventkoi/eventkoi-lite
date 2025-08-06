import { __ } from '@wordpress/i18n';
import React from 'react';

import { Button, ColorIndicator, ColorPicker, Dropdown, FlexItem, __experimentalHStack as HStack, __experimentalToolsPanelItem as ToolsPanelItem } from '@wordpress/components';

export const ColorSettingsPane = props => {

  const { colors, attributes, setAttributes } = props;

  return (
    <div className="color-block-support-panel__inner-wrapper">
      {colors.map(function (item, i) {
        var fallbackValue = item.default ? item.default : undefined;
        if (!item.label) {
          return null;
        }
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
                  <ColorIndicator className="block-editor-panel-color-gradient-settings__color-indicator" colorValue={attributes[item.value]} />
                  <FlexItem>{item.label}</FlexItem>
                </HStack>
              </Button>
            )}
            renderContent={() => <div className="components-dropdown-content-wrapper">
              <div className="block-editor-panel-color-gradient-settings__dropdown-content">
                <ColorPicker
                  color={attributes[item.value] ? attributes[item.value] : ''}
                  onChange={(newColor) => setAttributes({ [item.value]: newColor })}
                />
                {attributes[item.value] &&
                  <Button
                    variant="link"
                    className="ng-clear-color"
                    onClick={() => {
                      if (item.required) {
                        setAttributes({ [item.value]: '' });
                      } else {
                        setAttributes({ [item.value]: undefined });
                      }
                    }}
                  >
                    {__('Clear', 'newsletter-glue')}
                  </Button>
                }
              </div>
            </div>}
          />
        </ToolsPanelItem>
      })}
    </div>
  );

}