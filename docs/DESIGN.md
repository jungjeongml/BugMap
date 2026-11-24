---
name: Field Bio & Canopy
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#3f493f'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#6f7a6e'
  outline-variant: '#becabc'
  surface-tint: '#006d30'
  primary: '#00652c'
  on-primary: '#ffffff'
  primary-container: '#15803d'
  on-primary-container: '#d3ffd5'
  inverse-primary: '#79db8d'
  secondary: '#436648'
  on-secondary: '#ffffff'
  secondary-container: '#c4edc6'
  on-secondary-container: '#496d4d'
  tertiary: '#97344a'
  on-tertiary: '#ffffff'
  tertiary-container: '#b64c62'
  on-tertiary-container: '#fff1f1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#95f8a7'
  primary-fixed-dim: '#79db8d'
  on-primary-fixed: '#00210a'
  on-primary-fixed-variant: '#005323'
  secondary-fixed: '#c4edc6'
  secondary-fixed-dim: '#a9d0ab'
  on-secondary-fixed: '#00210a'
  on-secondary-fixed-variant: '#2c4e32'
  tertiary-fixed: '#ffd9dd'
  tertiary-fixed-dim: '#ffb2bd'
  on-tertiary-fixed: '#400013'
  on-tertiary-fixed-variant: '#81233b'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
  surface-pure: '#FFFFFF'
  surface-subtle: '#F9FAFB'
  surface-muted: '#F3F4F6'
  border-subtle: '#E5E7EB'
  border-strong: '#D1D5DB'
  text-primary: '#111827'
  text-secondary: '#4B5563'
  text-muted: '#6B7280'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '300'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '300'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '300'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  label-code:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

# 곤충맵 공통 디자인 지침

이 문서는 색상·서체·간격·형태·공통 컴포넌트·아이콘·접근성 등 여러 화면에서 일관되게 적용할 기준을 담는다. 상단 YAML은 곤충맵의 공통 토큰이다. 화면별 배치·입력·상태·예외와 구현 이력은 아래 문서를 참고한다.

| 문서 | 역할 |
|---|---|
| [메인 / 발견 지도](screens/main-map.md) | 지도 레이어·전용 색상·조작부·마커·내비게이션 |
| [발견·채집 기록 작성](screens/record-entry.md) | 사진·위치·발견 일시·관찰 글의 입력 구성과 상태 |
| [로그인](screens/login.md) | 로그인 화면 구성·선택 시안·공통 기준의 화면별 예외 |
| [디자인 하네스](design-harness.md) | AI 디자인 플러그인의 단계·파일·통과 조건·사람 승인 |
| [진행 기록](../memory/progress.md) | 완료 작업·실제 검증·산출물·남은 일 |

화면 명세에서 공통 기준과 다른 값을 쓰려면 이유와 적용 범위를 명시한다. 요구사항은 [PRD](PRD.md), 기술 결정은 [TDD](TDD.md)를 따른다.

## Brand & Style
The design system articulates an ethos of rigorous field botany and entomological observation filtered through clean, contemporary editorial utility. Eliminating decorative excess, gradients, and heavy drop shadows, the aesthetic emphasizes quiet clarity, scientific precision, and rapid one-handed mobile comprehension.

The audience encompasses field naturalists, community breeders, academic researchers, and nature enthusiasts. The visual experience must deliver:
- **Disciplined Restraint:** A strict single-chroma green foundation complemented by architectural monochromes, ensuring specimen imagery and geospatial content remain the primary focal points.
- **Modern Flat Clarity:** Clean planes, crisp linear dividers, deliberate white space, and zero unnecessary visual ornament.
- **Tactile Softness:** Substantial 32px (`rounded-4xl`) corner curvatures and pill-shaped interactive anchors that balance technical data with organic physical comfort.

## Colors
The color architecture relies strictly on a singular chromatic anchor—Forest Green (`#15803D`)—supported entirely by clean, functional monochrome neutrals. Multicolored accents and extraneous secondary color families are eliminated to maintain severe visual economy.

### Key Roles
- **Primary (`#15803D`):** Applied deliberately to essential interactive touchpoints: primary action buttons, active navigation markers, selection rings, and map focal points.
- **Neutral (`#111827`):** Deep charcoal slate providing optimal contrast for primary typographic elements, high-density taxonomy headers, and structural line work.

### Monochrome Surfaces & Dividers
- **Canvas & Elevated Cards (`#FFFFFF`):** Base background for cards, modal sheets, and standard viewports.
- **Subtle Surface (`#F9FAFB`):** Used for inset panels, alternating list bands, and inactive chip backgrounds.
- **Muted Surface (`#F3F4F6`):** Applied to search fields, secondary button states, and disabled controls.
- **Borders & Dividers (`#E5E7EB` / `#D1D5DB`):** Hairline borders delivering crisp definition without shadow reliance.
- **Text Layers:** Deep Slate (`#111827`) for titles, Medium Neutral (`#4B5563`) for body and metadata, and Soft Gray (`#6B7280`) for captions and secondary coordinates.

### 지도 중심 다크 팔레트

2026-11-16에 제작한 [첫 로그인](https://www.figma.com/design/LynbxdW8Qf7TavCrPLd2nY/BugMap?node-id=134-1239), [메인 발견 지도](https://www.figma.com/design/LynbxdW8Qf7TavCrPLd2nY/BugMap?node-id=163-1319), [발견/채집 기록 작성](https://www.figma.com/design/LynbxdW8Qf7TavCrPLd2nY/BugMap?node-id=164-1431)에 적용한다. 이 흐름을 확장할 때는 [`mapFlowColors`](../src/theme/tokens.ts)를 사용한다. 상단 YAML과 기존 `colors`는 라이트 시안 및 현재 로그인 구현의 기준이다.

| 용도 | 색 | 적용 |
|---|---|---|
| 화면 바탕 | `#101C16` | 작성 화면 바탕과 로그인 지도의 상·하단 페이드. 로그인 프레임의 바탕은 `#0B130F`. |
| 기본 텍스트 | `#F3F7EE` | 다크 배경의 제목·본문·주요 레이블. |
| 보조 텍스트 | `#BDCDC2` / `#A7BBAD` | 비활성 탭·보조 아이콘 / 입력 힌트. |
| 강조색 / 강조 버튼 글자 | `#C5EE79` / `#202E13` | 벡터 로고, 선택된 지도 탭, 관찰 마커, 발견/채집 기록하기와 작성완료 버튼. |
| 지도 음영 | `rgba(11, 24, 18, 0.77)` / `rgba(16, 32, 25, 0.67)` | 메인 지도 / 작성 화면의 위치 미리보기. 로그인은 지도를 화면 끝까지 깔아 상·하단의 페이드가 자연스럽게 이어지게 한다. |
| 내 주변 반경 | `rgba(147, 215, 83, 0.15)` / `#B5E974` | 반경 필터 적용 시 원형 영역의 채움과 윤곽. |
| 기록 묶음·선택 카드 | `#18271F` / `#192B20` | 집계 마커 바탕 / 선택 기록 카드 바탕. |
| 현재 위치 | `#82D0F0` / `rgba(130, 208, 240, 0.17)` | GPS 중심점 및 현재 위치 아이콘 / 위치 표시의 바깥 원. |
| 하단 지도 패널 | `#131E18` / `#3B4D42` | 검색·탭을 묶는 패널 바탕과 테두리. |
| 지도 검색창 | `#26342D` / `#3D5145` | 검색 입력 바탕과 테두리. |
| 활성 지도 탭 | `#2F4433` / `#52694A` | 선택된 탭 바탕과 테두리. 아이콘·레이블은 강조색을 사용한다. |
| 기록 작성 입력 | `#1C2C23` / `#3D5044` | 위치, 날짜·시간, 상황 메모 필드의 바탕과 테두리. |
| 사진 추가 칸 | `#26382C` / `#526954` | 사진 추가 칸의 바탕과 테두리. 카메라 아이콘은 강조색을 사용한다. |
| 작성 하단 영역 | `#152219` | 작성완료 버튼이 놓이는 하단 바탕. |

새 화면의 버튼·필드·패널에는 위 역할에 해당하는 토큰을 우선 적용한다. GPS는 위치 기능에 사용하고 소셜 로그인은 제공자별 공식 버튼 색을 사용한다.

### 메인 발견 지도

Figma `07 · 메인 / 발견 지도`의 다크 지도와 하단 패널을 바탕으로 적용한다. [화면 명세](./screens/main-map.md), [PRD](./PRD.md#5-기능-요구사항), [TDD](./TDD.md#지도-표시와-내-주변-반경)

| 상태 | 시각·인터랙션 기준 |
|---|---|
| 지도 기본 | Mapbox 지도 위에 공식 로고와 SDK의 출처 정보 버튼(`ⓘ`)을 둔다. 지도가 보이는 동안 두 요소가 읽히고 정보 버튼을 누를 수 있도록 하단 패널·상세 카드·안전 영역을 감안해 배치한다. 로고는 공식 형태와 색을 유지한다. [Mapbox 출처 표시 지침](https://docs.mapbox.com/help/dive-deeper/attribution/) |
| 내 주변 반경 적용 | 현재 위치 중심의 원을 `mapFlowColors.observationFill`과 `mapFlowColors.observationOutline`으로 그린다. 지형 위에 얇고 옅게 표시하고 위치점·마커는 그 위에 둔다. 예를 들어 `내 위치 기준 · 5 km 이내`로 거리 기준을 표시한다. 기본·`전체` 상태와 위치 미확인 상태에서는 연두색 경계를 숨긴다. 하늘색 현재 위치 점과 위치 표시용 바깥 원은 별도의 시각 요소다. |
| 축소·확대 | 축소 시 가까운 기록을 수량 배지가 있는 묶음으로 표시한다. 확대하면 개별 마커를 보여준다. |
| 기록 묶음 선택 | 선택한 마커를 강조하고 하단 내비게이션 자리에 주변 기록 패널을 연다. 패널 위에 지도와 강조된 마커가 보이게 배치한다. 목록과 닫기 동작은 [화면 명세](./screens/main-map.md#기록-묶음-선택)를 따른다. |
| 개별 기록 선택 | 선택한 마커를 강조하고 지도 위 하단 패널 위쪽에 카드 한 장을 띄운다. 카드에 사진 썸네일·곤충명·관찰/채집 유형·실제 발견 일시와 상세 열기 동작을 배치한다. 카드 변경·닫기에 맞춰 선택 강조를 갱신한다. |

후속 디자인 검수에서는 기본과 반경 적용, 축소와 확대, 묶음과 개별 기록 선택 상태를 확인한다. 카드·패널이 열린 상태에서 지도에 남은 공간으로 출처 버튼을 누를 수 있는지 확인한다.

## Typography
Typography is strictly anchored to Pretendard (with fallback to neutral system sans-serif like Inter). The scale is rigorously structured around three explicit weight roles: **Light (300)** for long-form narrative body and scientific descriptions, **Medium (500)** for interactive labels, taxonomy chips, and subheaders, and **Bold (700)** for primary headlines and data values.

### Formatting Rules
- **Taxonomy & Latin Names:** Latin binomial names (`Dorcus titanus castanicolor`) are rendered in `body-sm` (Light 300) with subtle italicization. Korean vernacular names use `headline-sm` or `label-lg` (Medium 500).
- **Tabular Figures & Specimen Metrics:** Field metrics (`78.4 mm`, `37.5665° N`) leverage `label-code` with strict tabular numerals for rapid comparison across rows.

## Layout & Spacing
The layout system enforces a structured 4px/8px modular rhythm designed for mobile and tablet touch surfaces. Content flows within a flexible grid that shifts cleanly between dual-column catalog cards and single-column detailed logs.

- **Margins & Gutters:** Base screen margins are set at `1rem` (16px), maintaining consistent breathing room along the device edge. In-grid column gaps use `1rem` (16px) gutters.
- **Touch Targets & Rhythm:** Touch-interactive components observe a minimum target dimension of 44px (with 48px standard for primary actions). Stacked section containers maintain `1.25rem` (20px) to `2rem` (32px) margins to maintain spacious, uncluttered layouts.

## Elevation & Depth
In alignment with strict flat design principles, multi-tiered drop shadows and colored ambient glows are completely eliminated. Depth is communicated strictly through surface layering and crisp structural outlines.

- **Level 0 (Base Canvas):** Pure white (`#FFFFFF`) or pale neutral grey (`#F9FAFB`) background planes.
- **Level 1 (Card & Panel Surface):** Flat `#FFFFFF` backed by a 1px solid border (`#E5E7EB`). Contrast is derived from subtle surface shift (`#F9FAFB` vs. `#FFFFFF`) rather than box shadows.
- **Level 2 (Overlays & Bottom Sheets):** Crisp white containers defined by a 1px outline (`#D1D5DB`) and an ultra-subtle, non-decorative occlusion rim (`0px 4px 16px rgba(17, 24, 39, 0.05)`).
- **Interactive Feedback:** Touch feedback triggers a subtle background shift (e.g., `#F9FAFB` to `#F3F4F6`) or an inverse tone rather than a dynamic elevation change.

## Shapes
The shape language features an extra-rounded, soft silhouette. Cards, sheets, and modular panels feature an expanded 32px corner radius (`rounded-4xl`), creating an inviting, pebble-like aesthetic that tempers technical scientific data.

- **Cards, Panels & Containers:** Formed with a strict 32px corner radius (`rounded-4xl`).
- **Buttons & Control Pills:** Formed with a 32px corner radius or full pill (`rounded-full` / 9999px).
- **Nested Media & Images:** Specimen images nested within 32px cards inherit an internal radius of 20px–24px to ensure harmonic concentric curvature.

## Components

### Iconography
All UI icons must be selected from the [Lucide icon catalog](https://lucide.dev/icons) and used as `lucide-react-native` components. Figma icon nodes, exported vectors, or rasterized copies are not UI icon sources. Select the closest semantic Lucide icon for general UI actions. Social sign-in provider marks are brand assets: use the provider’s official login artwork or official button component and follow its usage guide; do not substitute generic Lucide symbols or extract marks from Figma.

All system icons adhere strictly to the Lucide icon guidelines:
- **Geometry:** 24x24 pixel grid with uniform 2px stroke width (`stroke-width: 2`).
- **Style:** Clean lines, rounded caps and joins (`stroke-linecap: round`, `stroke-linejoin: round`), with no solid fills or decorative drop shadows.

### Buttons
- **Primary Button:** Solid Forest Green (`#15803D`), pure white text (`#FFFFFF`, Medium 500), 48px height, 32px or full pill border-radius. Active state shifts cleanly to `#166534`.
- **Secondary Button:** Surface `#F3F4F6`, text `#111827` (Medium 500), 1px solid `#E5E7EB`, 48px height, 32px radius.
- **Ghost/Text Action:** Zero background, text `#15803D` (Medium 500) with Lucide line icon trailing.

### Chips & Filter Tags
- **Taxonomy Filter Chips:** Full pill shape (`rounded-full`), 36px height, 14px horizontal padding.
  - *Inactive:* Surface `#FFFFFF`, border `1px solid #E5E7EB`, text `#4B5563`.
  - *Active:* Surface `#15803D`, border `1px solid #15803D`, text `#FFFFFF`.
- **Metadata Badges:** Subdued `#F3F4F6` surface, `#111827` text (Medium 500), border `1px solid #E5E7EB`, full pill shape.

### Input Fields & Search Bars
- **Search Control:** 48px height, 32px radius, surface `#F9FAFB`, border `1px solid #E5E7EB`. Leading 20px Lucide search icon in `#6B7280`. Focused state renders a crisp 2px border in `#15803D` with no blur shadow.
- **Form Fields:** Inset text inputs feature 32px radius, `#FFFFFF` surface, `1px solid #E5E7EB`, and `14px` Medium label headers.

### Cards & Feed Tiles
- **Observation Card:** Surface `#FFFFFF`, border `1px solid #E5E7EB`, radius `32px`, padding `16px`. Internal media features 20px corner curvature. Header presents taxonomy title in Bold (`#111827`) alongside a pill-shaped metadata tag. Bottom metadata row displays clean line icons with tabular coordinate strings.

### Lists, Checkboxes & Radio Buttons
- **List Dividers:** Crisp hairline rule `1px solid #F3F4F6` with zero drop shadows.
- **Checkboxes & Radios:** 20px controls with 2px stroke border (`#D1D5DB`). Selected state renders solid `#15803D` fill with white line checkmark. Radio buttons utilize a 32px full circle with a centered solid `#15803D` dot.

### Social sign-in brand exception · 2026-11-13

The approved [bugmap-login PRD](../work/bugmap-login/01-prd/PRD.md) separates general UI icons from provider brands. Kakao, Naver and Apple sign-in marks use official provider resources; logo geometry, colors and button proportions follow their own guides. This exception does not choose the backend authentication providers or change the existing implementation automatically. Sources and observed limits: [research](../work/bugmap-login/02-research/sources.md).
