import { css, unsafeCSS } from 'lit';

export const buttonStyle = (
	className: string,
	dim: number,
	font: number,
	shape: 'sharp' | 'pill' = 'pill',
) => css`
button.${ unsafeCSS(className) } {
	all: unset;
	cursor: pointer;
	width: ${ dim }px;
	height: ${ dim }px;
	display: grid;
	place-items: center;
	font-size: ${ font }px;
	position: relative;
	border-radius: ${ shape === 'pill' ? 999 : 8 }px;
}
button.${ unsafeCSS(className) }:hover::after {
	content: '';
	position: absolute;
	inset: 0;
	background-color: var(--midoc-tertiary-hover);
	border-radius: inherit;
}
`;
