# 👑 프린세스 스토리 — 언리얼 엔진(UE5) 버전

`game.js` 웹 버전을 **언리얼 엔진 5 C++ 프로젝트**로 포팅한 것입니다.

## ⚠️ 먼저 알아둘 것 (중요)

| 항목 | 내용 |
|---|---|
| 실행 방법 | **PC에 언리얼 엔진 5를 설치**하고 이 프로젝트를 열어야 합니다. 웹 버전과 달리 브라우저/GitHub Pages에서 플레이할 수 없습니다 (UE5는 HTML5 익스포트를 지원하지 않음). |
| 빌드 검증 | 이 코드는 언리얼 엔진이 없는 클라우드 환경에서 작성되어 **컴파일/실행 검증을 거치지 않았습니다.** 처음 열 때 사소한 컴파일 에러가 있을 수 있습니다. |
| 에셋 | `.uasset`/`.umap` 바이너리 에셋을 **하나도 사용하지 않습니다.** 맵·캐릭터·몬스터·HUD 전부 C++ 코드가 엔진 기본 도형(큐브/구/원뿔/원기둥)으로 절차적으로 생성합니다. 그래서 에디터 작업 없이 소스만으로 게임이 돌아갑니다. |
| 텍스트 | 엔진 기본 폰트에 한글 글리프가 없어 게임 내 텍스트(HUD)는 영문입니다. |

## 실행 방법 (Windows 기준)

1. Epic Games Launcher에서 **Unreal Engine 5.4** 설치 (5.3~5.5도 가능 — `PrincessStory.uproject`의 `EngineAssociation` 수정)
2. Visual Studio 2022 + "Game development with C++" 워크로드 설치
3. `PrincessStory.uproject` 더블클릭 → "프로젝트 모듈을 빌드하시겠습니까?" → **예**
   (또는 우클릭 → Generate Visual Studio project files → `.sln` 열어서 빌드)
4. 에디터가 열리면 **Play (Alt+P)** — 빈 기본 맵 위에 게임모드가 레벨 전체를 자동 생성합니다.

## 조작법

| 동작 | 키 |
|---|---|
| 이동 | ←/→ 또는 A/D |
| 점프 | Space / W |
| 기본 공격 | Z / Ctrl |
| 프린세스 애로우 (MP 8) | X |
| 로얄 블래스트 (MP 25) | C |
| 포탈 이동 | ↑ / Enter |

## 콘텐츠 (웹 버전 대비 축소 포팅)

- **맵 4개**: Princess Town → Grass Hill → Mushroom Forest → Dark Cave
- **일반 몬스터 6종** + **보스 자쿰** (Dark Cave 최심부)
- 레벨/경험치/메소, 크리티컬, 몬스터 리스폰, 사망 시 EXP 5% 페널티
- 몬스터 머리 위 HP바, 보스 전용 대형 HP바, 포탈 라벨 등 Canvas HUD

미포팅: NPC/상점, 코디샵(커스터마이징), 자동 저장. (웹 버전에는 모두 있음)

## 코드 구조

```
Source/PrincessStory/
├── PSGameMode.{h,cpp}    맵 데이터 정의 + 절차적 레벨 생성 + 맵 이동/리스폰
├── PSCharacter.{h,cpp}   플레이어 (이동/점프/공격/스킬/스탯/레벨)
├── PSMonster.{h,cpp}     몬스터 (순찰·추적 AI, 접촉 데미지)
├── PSProjectile.{h,cpp}  프린세스 애로우 투사체
├── PSPortal.{h,cpp}      맵 이동 포탈
├── PSBlock.{h,cpp}       범용 도형 블록 (발판/배경/이펙트)
├── PSHUD.{h,cpp}         Canvas 드로잉 HUD
└── PSTypes.h             맵/몬스터 정적 데이터 구조체
```

밸런스 수치(몬스터 스탯, 맵 배치)는 전부 `PSGameMode.cpp`의 `DefineData()`에 모여 있어 수정이 쉽습니다.
