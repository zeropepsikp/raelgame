#pragma once

#include "CoreMinimal.h"

// 정적 데이터 정의 (game.js의 MAPS / MONSTER_DEFS에 해당)

struct FPSPlatformDef
{
	float X = 0.f;      // 발판 중심 X
	float Z = 0.f;      // 발판 윗면 높이
	float Width = 300.f;
};

struct FPSMonsterTypeDef
{
	FString Name;
	FLinearColor Color = FLinearColor::White;
	float Scale = 1.f;
	int32 MaxHP = 10;
	int32 Damage = 5;
	int32 Exp = 5;
	int32 Meso = 5;
	float Speed = 100.f;
	bool bAggressive = false;
	bool bBoss = false;
};

struct FPSMonsterSpawnDef
{
	int32 TypeIndex = 0;
	float X = 0.f;
};

struct FPSPortalDef
{
	float X = 0.f;
	int32 TargetMap = 0;
	float TargetX = 300.f;
	FString Label;
};

struct FPSMapDef
{
	FString Name;
	float Length = 8000.f;
	float SpawnX = 400.f;
	FLinearColor SkyColor = FLinearColor(0.5f, 0.7f, 1.f);
	FLinearColor GroundColor = FLinearColor(0.35f, 0.6f, 0.25f);
	FLinearColor PlatformColor = FLinearColor(0.55f, 0.4f, 0.25f);
	TArray<FPSPlatformDef> Platforms;
	TArray<FPSMonsterSpawnDef> Monsters;
	TArray<FPSPortalDef> Portals;
};
