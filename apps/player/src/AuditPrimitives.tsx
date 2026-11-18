import styled from 'styled-components/native';
import { space } from './designTokens';
/** Passive information uses spacing and headings, never a card-shaped affordance. */
export const PlainSection = styled.View`
  gap: ${space.sm}px;
`;
/** Shared optical column for actionable rows. The icon has no colored backplate. */
export const IconSlot = styled.View`
  width: ${space.lg}px;
  min-height: ${space.xxl}px;
  align-items: center;
  justify-content: center;
`;
