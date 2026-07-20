#include "PSHUD.h"
#include "PSCharacter.h"
#include "PSGameMode.h"
#include "PSMonster.h"
#include "PSPortal.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "EngineUtils.h"

void APSHUD::DrawBar(float X, float Y, float W, float H, float Pct,
	const FLinearColor& Fill, const FString& Label, UFont* Font, float TextScale)
{
	Pct = FMath::Clamp(Pct, 0.f, 1.f);
	DrawRect(FLinearColor(0.f, 0.f, 0.f, 0.6f), X - 2.f, Y - 2.f, W + 4.f, H + 4.f);
	DrawRect(FLinearColor(0.15f, 0.15f, 0.18f), X, Y, W, H);
	DrawRect(Fill, X, Y, W * Pct, H);
	if (!Label.IsEmpty())
	{
		DrawText(Label, FLinearColor::White, X + 6.f, Y - 1.f, Font, TextScale, false);
	}
}

void APSHUD::DrawHUD()
{
	Super::DrawHUD();

	APSCharacter* C = Cast<APSCharacter>(GetOwningPawn());
	APSGameMode* GM = GetWorld() ? GetWorld()->GetAuthGameMode<APSGameMode>() : nullptr;
	if (!C || !GM || !Canvas)
	{
		return;
	}

	const float W = Canvas->SizeX;
	const float H = Canvas->SizeY;
	const float S = W / 1600.f;
	UFont* Font = GEngine->GetMediumFont();
	UFont* SmallFont = GEngine->GetSmallFont();

	// 좌상단: 맵 이름 / 메소
	DrawText(GM->GetCurrentMap().Name, FLinearColor::White, 24.f * S, 20.f * S, Font, 1.7f * S, false);
	DrawText(FString::Printf(TEXT("Meso: %d"), C->Meso),
		FLinearColor(1.f, 0.85f, 0.3f), 24.f * S, 56.f * S, Font, 1.2f * S, false);

	// 우상단: 조작 안내
	DrawText(TEXT("Z Attack | X Arrow(8MP) | C Blast(25MP) | Space Jump | Up Portal"),
		FLinearColor(0.85f, 0.85f, 0.9f), W - 620.f * S, 22.f * S, SmallFont, 1.2f * S, false);

	// 하단: 레벨 / HP / MP / EXP
	const float BX = W * 0.5f - 330.f * S;
	const float BY = H - 96.f * S;
	DrawText(FString::Printf(TEXT("Lv.%d Princess"), C->Level),
		FLinearColor::White, BX, BY - 34.f * S, Font, 1.35f * S, false);

	DrawBar(BX, BY, 210.f * S, 18.f * S, C->HP / C->MaxHP, FLinearColor(0.9f, 0.2f, 0.3f),
		FString::Printf(TEXT("HP %d/%d"), FMath::RoundToInt(C->HP), FMath::RoundToInt(C->MaxHP)), SmallFont, 1.1f * S);
	DrawBar(BX + 230.f * S, BY, 210.f * S, 18.f * S, C->MP / C->MaxMP, FLinearColor(0.25f, 0.45f, 0.95f),
		FString::Printf(TEXT("MP %d/%d"), FMath::RoundToInt(C->MP), FMath::RoundToInt(C->MaxMP)), SmallFont, 1.1f * S);

	const int32 Need = APSCharacter::ExpNeedFor(C->Level);
	DrawBar(BX, BY + 34.f * S, 660.f * S, 12.f * S, static_cast<float>(C->Exp) / Need,
		FLinearColor(1.f, 0.8f, 0.2f),
		FString::Printf(TEXT("EXP %d/%d"), C->Exp, Need), SmallFont, 1.f * S);

	// 알림 메시지 (최근 3초)
	const double Now = GetWorld()->GetTimeSeconds();
	int32 Row = 0;
	for (int32 i = C->Notices.Num() - 1; i >= 0 && Row < 5; --i)
	{
		if (Now - C->Notices[i].Time > 3.0)
		{
			break;
		}
		DrawText(C->Notices[i].Text, FLinearColor(1.f, 1.f, 0.8f),
			W * 0.5f - 180.f * S, 120.f * S + Row * 28.f * S, Font, 1.2f * S, false);
		Row++;
	}

	// 몬스터 머리 위 이름/HP바 (+ 보스 대형 바)
	for (TActorIterator<APSMonster> It(GetWorld()); It; ++It)
	{
		APSMonster* M = *It;
		if (!IsValid(M) || M->IsDying())
		{
			continue;
		}
		const FVector Head = M->GetActorLocation() + FVector(0.f, 0.f, 60.f * M->BodyScale + 50.f);
		const FVector Screen = Canvas->Project(Head);
		if (Screen.Z > 0.f)
		{
			const float BarW = 76.f * S;
			DrawText(M->MonsterName, FLinearColor::White,
				Screen.X - BarW * 0.5f, Screen.Y - 22.f * S, SmallFont, 1.f * S, false);
			DrawBar(Screen.X - BarW * 0.5f, Screen.Y, BarW, 7.f * S,
				static_cast<float>(M->HP) / M->MaxHP, FLinearColor(0.9f, 0.25f, 0.25f), FString(), SmallFont, 1.f);
		}

		if (M->bBoss)
		{
			DrawText(FString::Printf(TEXT("BOSS: %s"), *M->MonsterName), FLinearColor(1.f, 0.4f, 0.3f),
				W * 0.5f - 200.f * S, 60.f * S, Font, 1.4f * S, false);
			DrawBar(W * 0.5f - 250.f * S, 92.f * S, 500.f * S, 16.f * S,
				static_cast<float>(M->HP) / M->MaxHP, FLinearColor(0.85f, 0.15f, 0.15f),
				FString::Printf(TEXT("%d / %d"), M->HP, M->MaxHP), SmallFont, 1.f * S);
		}
	}

	// 포탈 라벨
	for (TActorIterator<APSPortal> It(GetWorld()); It; ++It)
	{
		const FVector Screen = Canvas->Project(It->GetActorLocation() + FVector(0.f, 0.f, 180.f));
		if (Screen.Z > 0.f)
		{
			DrawText(FString::Printf(TEXT("[Up] -> %s"), *It->Label),
				FLinearColor(0.6f, 0.85f, 1.f), Screen.X - 60.f * S, Screen.Y, SmallFont, 1.1f * S, false);
		}
	}
}
