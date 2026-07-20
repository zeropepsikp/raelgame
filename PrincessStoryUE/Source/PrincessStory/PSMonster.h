#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "PSTypes.h"
#include "PSMonster.generated.h"

// 몬스터: 순찰/추적 AI + 접촉 데미지. 외형은 색 입힌 구체 + 눈.
UCLASS()
class APSMonster : public ACharacter
{
	GENERATED_BODY()

public:
	APSMonster();

	virtual void Tick(float DeltaSeconds) override;

	void InitFromDef(const FPSMonsterTypeDef& Def, int32 InTypeIndex, float InHomeX);
	void ApplyHit(int32 Damage, float FromX);
	bool IsDying() const { return bDying; }

	FString MonsterName;
	int32 HP = 10;
	int32 MaxHP = 10;
	int32 TouchDamage = 5;
	int32 ExpReward = 5;
	int32 MesoReward = 5;
	bool bBoss = false;
	int32 TypeIndex = 0;
	float HomeX = 0.f;
	float BodyScale = 1.f;

private:
	UPROPERTY() TObjectPtr<UStaticMeshComponent> Body;
	UPROPERTY() TObjectPtr<UStaticMeshComponent> EyeL;
	UPROPERTY() TObjectPtr<UStaticMeshComponent> EyeR;
	UPROPERTY() TObjectPtr<UMaterialInterface> BaseMaterial;
	UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> BodyMID;

	FLinearColor BaseColor = FLinearColor::White;
	bool bAggressive = false;
	bool bDying = false;
	float PatrolDir = 1.f;
	float HitFlash = 0.f;
};
