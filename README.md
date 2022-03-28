# Guide to PDF

가이드 페이지를 PDF로 변환하는 Electron 어플리케이션입니다.

## 제공하는 기능

- PDF 다운로드
- 페이지 미리보기

## 사용가능한 스크립트

### `yarn dev`

Electron 어플리케이션을 개발모드로 실행합니다.\
화면을 표시하는 `Renderer` 영역과
어플리케이션이 동작하는 `Main` 영역이 나눠어져 있습니다.

- `Renderer`: src/App.tsx
- `Main`: src/electron/electron.ts

**참고: `Renderer` 영역이 수정되면 자동으로 반영되지만,
`Main` 영역이 수정된 경우에는 종료 후 재실행해야 합니다.**

### `yarn dist`

Electron 어플리케이션으로 패키징합니다.\
패키징된 파일은 `dist` 폴더에 생성됩니다.
