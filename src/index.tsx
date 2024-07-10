import { createRoot } from 'react-dom/client';
import App from './App';
// import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import ThemeProvider from '@mui/material/styles/ThemeProvider';
import createTheme from '@mui/material/styles/createTheme';

import {
	frFR as ApiRtcMuiReactLib_frFR,
	setLogLevel as setApiRtcMuiReactLibLogLevel,
} from '@apirtc/mui-react-lib';
import { setLogLevel as setApiRtcReactLibLogLevel } from '@apirtc/react-lib';

import { ROOM_THEME_OPTIONS } from './constants';
import './index.css';
import { frFR } from './locale/frFR';
import { setLogLevel } from './logLevel';

setLogLevel('warn');
setApiRtcReactLibLogLevel(globalThis.logLevel.level);
setApiRtcMuiReactLibLogLevel(globalThis.logLevel.level);

function getLangFiles() {
	switch (navigator.language) {
		case 'fr':
		case 'fr-FR':
			return [frFR, ApiRtcMuiReactLib_frFR];
		default:
			return [];
	}
}
// To update <html lang='en'> attribute with correct language
document.documentElement.setAttribute('lang', navigator.language.slice(0, 2));

export const setFavIcon = (url: string) => {
	const linkElement = document.querySelector("link[rel='icon']");
	if (linkElement) {
		(linkElement as any).href = url;
	}
}

declare module '@mui/material/styles' {
	interface Palette {
		neutral: Palette['primary'];
	}

	interface PaletteOptions {
		neutral: PaletteOptions['primary'];
	}
}

const theme = createTheme(
	{
		palette: {
			mode: 'light',
			primary: {
				main: '#F76B40',
				light: '#ba3108',
				dark: '#f88562',
			},
			secondary: {
				main: '#5b5baf',
				light: '#8eabc7',
				dark: '#2e455c',
			},
			success: {
				main: '#0F5712',
				light: '#17821A',
				dark: '#0A340B',
			},
			info: {
				main: '#1355AE',
			},
			neutral: {
				main: 'rgba(0, 0, 0, 0.23)',
			},
		},
		typography: {
			button: {
				textTransform: 'none',
			},
		},
		...ROOM_THEME_OPTIONS,
	},
	...getLangFiles()
);

const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(
		<ThemeProvider theme={theme}>
			<BrowserRouter basename="/web-guest">
				<Routes>
					{/* will try to get invitation data from search parameter */}
					<Route path="/" element={<App />} />
					{/* will try to get invitation data from path parameter */}
					<Route path="/:invitationData" element={<App />} />
				</Routes>
			</BrowserRouter>
		</ThemeProvider>
	);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
