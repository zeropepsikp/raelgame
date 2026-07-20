#include "PSGameMode.h"
#include "PSCharacter.h"
#include "PSHUD.h"
#include "PSMonster.h"
#include "PSPortal.h"
#include "PSProjectile.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Engine/TextureCube.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerStart.h"
#include "Kismet/GameplayStatics.h"
#include "TimerManager.h"

APSGameMode::APSGameMode()
{
	DefaultPawnClass = APSCharacter::StaticClass();
	HUDClass = APSHUD::StaticClass();
}

void APSGameMode::InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage)
{
	Super::InitGame(MapName, Options, ErrorMessage);

	DefineData();
	SpawnLights();
	BuildMap(0);

	StartSpot = GetWorld()->SpawnActor<APlayerStart>(
		FVector(Maps[0].SpawnX, 0.f, 200.f), FRotator::ZeroRotator);
}

AActor* APSGameMode::ChoosePlayerStart_Implementation(AController* Player)
{
	if (StartSpot)
	{
		return StartSpot;
	}
	return Super::ChoosePlayerStart_Implementation(Player);
}

void APSGameMode::DefineData()
{
	// ---- 몬스터 종류 (game.js MONSTER_DEFS 포팅) ----
	MonsterTypes = {
		{ TEXT("Green Snail"),     FLinearColor(0.35f, 0.75f, 0.30f), 0.50f,   20,  5,   8,   10,  60.f, false, false },
		{ TEXT("Slime"),           FLinearColor(0.35f, 0.55f, 0.95f), 0.60f,   35,  8,  14,   18,  90.f, false, false },
		{ TEXT("Orange Mushroom"), FLinearColor(0.95f, 0.55f, 0.15f), 0.65f,   55, 12,  22,   30, 110.f, true,  false },
		{ TEXT("Ribbon Pig"),      FLinearColor(1.00f, 0.60f, 0.70f), 0.70f,   80, 16,  32,   45, 130.f, true,  false },
		{ TEXT("Skeleton"),        FLinearColor(0.85f, 0.85f, 0.80f), 0.80f,  140, 22,  55,   80, 150.f, true,  false },
		{ TEXT("Dark Golem"),      FLinearColor(0.40f, 0.25f, 0.55f), 1.00f,  260, 30,  95,  150, 120.f, true,  false },
		{ TEXT("Zakum"),           FLinearColor(0.65f, 0.15f, 0.10f), 1.80f, 1500, 45, 800, 2000, 100.f, true,  true  },
	};

	// ---- 맵 4개 ----
	{
		FPSMapDef M;
		M.Name = TEXT("Princess Town");
		M.Length = 6000.f;
		M.SpawnX = 400.f;
		M.SkyColor = FLinearColor(0.95f, 0.75f, 0.85f);
		M.GroundColor = FLinearColor(0.45f, 0.65f, 0.35f);
		M.PlatformColor = FLinearColor(0.75f, 0.55f, 0.65f);
		M.Platforms = { { 1200.f, 200.f, 500.f }, { 2400.f, 340.f, 400.f }, { 3600.f, 200.f, 500.f } };
		M.Portals = { { 5700.f, 1, 300.f, TEXT("Grass Hill") } };
		Maps.Add(M);
	}
	{
		FPSMapDef M;
		M.Name = TEXT("Grass Hill");
		M.Length = 9000.f;
		M.SpawnX = 300.f;
		M.SkyColor = FLinearColor(0.55f, 0.78f, 1.00f);
		M.GroundColor = FLinearColor(0.35f, 0.62f, 0.28f);
		M.PlatformColor = FLinearColor(0.55f, 0.42f, 0.25f);
		M.Platforms = { { 2000.f, 220.f, 450.f }, { 3500.f, 380.f, 400.f }, { 5200.f, 220.f, 500.f }, { 7000.f, 340.f, 420.f } };
		M.Monsters = { { 0, 1500.f }, { 0, 2600.f }, { 1, 3800.f }, { 0, 4800.f }, { 1, 6000.f }, { 1, 7400.f } };
		M.Portals = { { 200.f, 0, 5500.f, TEXT("Princess Town") }, { 8800.f, 2, 300.f, TEXT("Mushroom Forest") } };
		Maps.Add(M);
	}
	{
		FPSMapDef M;
		M.Name = TEXT("Mushroom Forest");
		M.Length = 9000.f;
		M.SpawnX = 300.f;
		M.SkyColor = FLinearColor(0.35f, 0.55f, 0.40f);
		M.GroundColor = FLinearColor(0.30f, 0.45f, 0.22f);
		M.PlatformColor = FLinearColor(0.48f, 0.35f, 0.22f);
		M.Platforms = { { 1800.f, 240.f, 450.f }, { 3300.f, 400.f, 380.f }, { 4900.f, 240.f, 480.f }, { 6600.f, 380.f, 420.f } };
		M.Monsters = { { 2, 1600.f }, { 2, 2800.f }, { 3, 4000.f }, { 2, 5200.f }, { 3, 6400.f }, { 3, 7600.f } };
		M.Portals = { { 200.f, 1, 8600.f, TEXT("Grass Hill") }, { 8800.f, 3, 300.f, TEXT("Dark Cave") } };
		Maps.Add(M);
	}
	{
		FPSMapDef M;
		M.Name = TEXT("Dark Cave");
		M.Length = 8000.f;
		M.SpawnX = 300.f;
		M.SkyColor = FLinearColor(0.12f, 0.10f, 0.18f);
		M.GroundColor = FLinearColor(0.25f, 0.22f, 0.30f);
		M.PlatformColor = FLinearColor(0.35f, 0.30f, 0.42f);
		M.Platforms = { { 1700.f, 240.f, 420.f }, { 3200.f, 400.f, 380.f }, { 4700.f, 240.f, 450.f } };
		M.Monsters = { { 4, 1400.f }, { 4, 2500.f }, { 5, 3700.f }, { 4, 4800.f }, { 5, 5600.f }, { 6, 7000.f } };
		M.Portals = { { 200.f, 2, 8600.f, TEXT("Mushroom Forest") } };
		Maps.Add(M);
	}
}

void APSGameMode::SpawnLights()
{
	UWorld* World = GetWorld();

	if (ADirectionalLight* Sun = World->SpawnActor<ADirectionalLight>(
		FVector(0.f, 0.f, 2000.f), FRotator(-50.f, 35.f, 0.f)))
	{
		if (ULightComponent* LC = Sun->GetLightComponent())
		{
			LC->SetMobility(EComponentMobility::Movable);
			LC->SetIntensity(5.f);
		}
	}

	if (ASkyLight* Sky = World->SpawnActor<ASkyLight>(FVector(0.f, 0.f, 2000.f), FRotator::ZeroRotator))
	{
		if (USkyLightComponent* SC = Sky->GetLightComponent())
		{
			SC->SetMobility(EComponentMobility::Movable);
			if (UTextureCube* Cubemap = LoadObject<UTextureCube>(nullptr,
				TEXT("/Engine/MapTemplates/Sky/DaylightAmbientCubemap.DaylightAmbientCubemap")))
			{
				SC->SourceType = ESkyLightSourceType::SLS_SpecifiedCubemap;
				SC->Cubemap = Cubemap;
			}
			SC->SetIntensity(1.2f);
			SC->MarkRenderStateDirty();
			SC->RecaptureSky();
		}
	}
}

APSBlock* APSGameMode::SpawnBlock(APSBlock::EShape Shape, const FVector& Center, const FVector& Size,
	const FLinearColor& Color, bool bCollide)
{
	APSBlock* B = GetWorld()->SpawnActor<APSBlock>(Center, FRotator::ZeroRotator);
	if (B)
	{
		B->InitShape(Shape, Size / 100.f, Color, bCollide);
		MapActors.Add(B);
	}
	return B;
}

void APSGameMode::BuildMap(int32 MapIndex)
{
	CurrentMapIndex = MapIndex;
	const FPSMapDef& M = Maps[MapIndex];
	UWorld* World = GetWorld();

	// 배경(하늘) 벽 — 카메라 반대편(-Y)에 세운다
	SpawnBlock(APSBlock::EShape::Cube,
		FVector(M.Length * 0.5f, -420.f, 1400.f), FVector(M.Length + 8000.f, 60.f, 7000.f), M.SkyColor, false);

	// 바닥
	SpawnBlock(APSBlock::EShape::Cube,
		FVector(M.Length * 0.5f, 0.f, -60.f), FVector(M.Length + 400.f, 340.f, 120.f), M.GroundColor, true);

	// 양끝 벽
	SpawnBlock(APSBlock::EShape::Cube,
		FVector(-100.f, 0.f, 700.f), FVector(120.f, 340.f, 1600.f), M.GroundColor, true);
	SpawnBlock(APSBlock::EShape::Cube,
		FVector(M.Length + 100.f, 0.f, 700.f), FVector(120.f, 340.f, 1600.f), M.GroundColor, true);

	// 발판
	for (const FPSPlatformDef& P : M.Platforms)
	{
		SpawnBlock(APSBlock::EShape::Cube,
			FVector(P.X, 0.f, P.Z - 20.f), FVector(P.Width, 220.f, 40.f), M.PlatformColor, true);
	}

	// 몬스터
	for (const FPSMonsterSpawnDef& S : M.Monsters)
	{
		SpawnMonster(S.TypeIndex, S.X);
	}

	// 포탈
	for (const FPSPortalDef& D : M.Portals)
	{
		APSPortal* Portal = World->SpawnActor<APSPortal>(FVector(D.X, 0.f, 115.f), FRotator::ZeroRotator);
		if (Portal)
		{
			Portal->Init(D.TargetMap, D.TargetX, D.Label);
			MapActors.Add(Portal);
		}
	}
}

void APSGameMode::ClearMap()
{
	GetWorldTimerManager().ClearAllTimersForObject(this);

	for (TWeakObjectPtr<AActor>& A : MapActors)
	{
		if (A.IsValid())
		{
			A->Destroy();
		}
	}
	MapActors.Reset();

	for (TActorIterator<APSMonster> It(GetWorld()); It; ++It)
	{
		It->Destroy();
	}
	for (TActorIterator<APSProjectile> It(GetWorld()); It; ++It)
	{
		It->Destroy();
	}
}

void APSGameMode::SpawnMonster(int32 TypeIndex, float X)
{
	if (!MonsterTypes.IsValidIndex(TypeIndex))
	{
		return;
	}
	FActorSpawnParameters Params;
	Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;
	APSMonster* Monster = GetWorld()->SpawnActor<APSMonster>(
		FVector(X, 0.f, 180.f), FRotator::ZeroRotator, Params);
	if (Monster)
	{
		Monster->InitFromDef(MonsterTypes[TypeIndex], TypeIndex, X);
	}
}

APSCharacter* APSGameMode::GetPlayerChar() const
{
	return Cast<APSCharacter>(UGameplayStatics::GetPlayerPawn(this, 0));
}

void APSGameMode::TravelToMap(int32 MapIndex, float TargetX)
{
	if (!Maps.IsValidIndex(MapIndex))
	{
		return;
	}

	ClearMap();
	BuildMap(MapIndex);

	if (APSCharacter* C = GetPlayerChar())
	{
		C->GetCharacterMovement()->StopMovementImmediately();
		C->SetActorLocation(FVector(TargetX, 0.f, 160.f));
		C->AddNotice(FString::Printf(TEXT("Moved to %s"), *Maps[MapIndex].Name));
	}
}

void APSGameMode::TryUsePortal(APSCharacter* Player)
{
	if (!Player)
	{
		return;
	}
	const FVector Loc = Player->GetActorLocation();
	for (TActorIterator<APSPortal> It(GetWorld()); It; ++It)
	{
		APSPortal* Portal = *It;
		if (FMath::Abs(Portal->GetActorLocation().X - Loc.X) < 150.f && FMath::Abs(Portal->GetActorLocation().Z - Loc.Z) < 250.f)
		{
			TravelToMap(Portal->TargetMap, Portal->TargetX);
			return;
		}
	}
}

void APSGameMode::NotifyMonsterKilled(APSMonster* Monster)
{
	APSCharacter* C = GetPlayerChar();
	if (!C || !Monster)
	{
		return;
	}

	C->GainExp(Monster->ExpReward);
	C->GainMeso(Monster->MesoReward);
	C->AddNotice(FString::Printf(TEXT("%s defeated! +%d EXP +%d meso"),
		*Monster->MonsterName, Monster->ExpReward, Monster->MesoReward));

	if (Monster->bBoss)
	{
		C->AddNotice(TEXT("*** BOSS CLEARED! ***"));
		return;
	}

	// 8초 뒤 같은 자리에서 리스폰 (맵을 떠나지 않았다면)
	const int32 Type = Monster->TypeIndex;
	const float HomeX = Monster->HomeX;
	const int32 MapAtDeath = CurrentMapIndex;
	FTimerHandle Handle;
	GetWorldTimerManager().SetTimer(Handle,
		FTimerDelegate::CreateWeakLambda(this, [this, Type, HomeX, MapAtDeath]()
		{
			if (CurrentMapIndex == MapAtDeath)
			{
				SpawnMonster(Type, HomeX);
			}
		}),
		8.f, false);
}

void APSGameMode::RespawnPlayer(APSCharacter* Player)
{
	if (!Player)
	{
		return;
	}
	Player->GetCharacterMovement()->StopMovementImmediately();
	Player->SetActorLocation(FVector(Maps[CurrentMapIndex].SpawnX, 0.f, 180.f));
}
