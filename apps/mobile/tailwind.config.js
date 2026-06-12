/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 웹에서 Appearance.setColorScheme('light')가 media 모드와 충돌하지 않도록 class 모드 사용
  darkMode: 'class',
  theme: {
    extend: {
      // Duolingo 스타일 팔레트 — 프로토타입(prototype/index.html)과 동일
      colors: {
        brand: {
          DEFAULT: '#58cc02',
          dark: '#46a302',
          light: '#d7ffb8',
        },
        sky: { DEFAULT: '#1cb0f6', dark: '#1899d6' },
        danger: { DEFAULT: '#ff4b4b', dark: '#ea2b2b', light: '#ffdfe0' },
        gold: '#ffc800',
        grape: '#ce82ff',
        ink: { DEFAULT: '#3c3c3c', sub: '#777777' },
        line: '#e5e5e5',
        paper: '#f7f7f7',
      },
    },
  },
  plugins: [],
};
