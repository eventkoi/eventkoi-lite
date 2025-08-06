import styled from "styled-components";

export function Grid({ children }) {
  const StyledDiv = styled.div`
    display: grid;
    gap: calc(16px);
    grid-template-columns: repeat(2, minmax(0px, 1fr));
  `;

  return <StyledDiv>{children}</StyledDiv>;
}
