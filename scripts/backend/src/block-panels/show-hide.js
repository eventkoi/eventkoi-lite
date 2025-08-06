import styled from "styled-components";

import { Button } from "@wordpress/components";

import { seen, unseen } from "@wordpress/icons";

export function ShowHide({ id, label, attributes, setAttributes }) {
  const StyledDiv = styled.div`
    display: flex;
    padding: 4px 8px 4px 20px;
    margin: 6px 0;
    border: 1px solid ${attributes[id] ? "#e1e1e1" : "#e9e9e9"};
    justify-content: space-between;
    min-height: 42px;
    font-size: 14px;
    align-items: center;
    border-radius: 4px;
  `;

  const StyledLabel = styled.div`
    opacity: ${attributes[id] ? 1 : 0.5};
  `;

  return (
    <StyledDiv>
      <StyledLabel>{label}</StyledLabel>
      <Button
        className="eventkoi-showhide-btn"
        icon={attributes[id] ? seen : unseen}
        iconSize={24}
        label={attributes[id] ? "Hide" : "Show"}
        showTooltip
        onClick={() => {
          setAttributes({ [id]: !attributes[id] });
        }}
      />
    </StyledDiv>
  );
}
