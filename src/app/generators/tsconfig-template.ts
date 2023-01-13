import { stringDedent } from '../../build/helpers/string-dedent.js';

export const tsconfigTemplate = stringDedent(`
{
	"compilerOptions": {
		"rootDir": ".",
		"baseUrl": ".",
		"noEmit": true,
		"incremental": false,
		"target": "ESNext",
		"module": "ESNext",
		"moduleResolution": "node",
		"lib": [
			"ESNext",
			"DOM",
			"DOM.Iterable",
		],
		"pretty": true,
		"importHelpers": true,
		"removeComments": true,
		"strict": true,
		"noUncheckedIndexedAccess": true,
		"noPropertyAccessFromIndexSignature": true,
		"strictPropertyInitialization": false,
		"forceConsistentCasingInFileNames": true,
		"allowSyntheticDefaultImports": true,
		"noImplicitOverride": true,
		"useDefineForClassFields": false,
		"noEmitOnError": true,
		"allowJs": true,
		"esModuleInterop": true,
		"skipLibCheck": true,
		"resolveJsonModule": true,
		"noUnusedLocals": false,
		"noUnusedParameters": false,
		"noFallthroughCasesInSwitch": true,
		"strictNullChecks": true,
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true,
		"noImplicitReturns": false,
		"noImplicitAny": true,
		"noImplicitThis": true,
		"isolatedModules": true,
	},
	"include": [
		"./**/*.js",
		"./**/*.ts",
		"./**/*.d.ts",
	],
	"exclude": []
}
`);
