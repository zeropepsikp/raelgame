#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "PSCharacter.generated.h"

struct FPSNotice
{
	FString Text;
	double Time = 0.0;
};

// 플레이어 프린세스. 횡스크롤 이동 + 근접 공격 + 스킬 2종 + 스탯/레벨.
UCLASS()
class APSCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	APSCharacter();

	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;

	void GainExp(int32 Amount);
	void GainMeso(int32 Amount);
	void AddNotice(const FString& Text);
	void ReceiveMonsterHit(int32 Damage, float FromX);

	static int32 ExpNeedFor(int32 InLevel);

	int32 Level = 1;
	float HP = 100.f;
	float MaxHP = 100.f;
	float MP = 50.f;
	float MaxMP = 50.f;
	int32 Exp = 0;
	int32 Meso = 0;
	float FacingX = 1.f;
	TArray<FPSNotice> Notices;

protected:
	virtual void BeginPlay() override;

private:
	UPROPERTY() TObjectPtr<class USpringArmComponent> CameraBoom;
	UPROPERTY() TObjectPtr<class UCameraComponent> Camera;
	UPROPERTY() TObjectPtr<UStaticMeshComponent> Dress;
	UPROPERTY() TObjectPtr<UStaticMeshComponent> Head;
	UPROPERTY() TObjectPtr<UStaticMeshComponent> Hair;
	UPROPERTY() TObjectPtr<UStaticMeshComponent> Crown;
	UPROPERTY() TObjectPtr<UStaticMeshComponent> Sword;
	UPROPERTY() TObjectPtr<UMaterialInterface> BaseMaterial;

	double LastMeleeTime = -10.0;
	double LastArrowTime = -10.0;
	double LastBlastTime = -10.0;
	double InvulnUntil = -10.0;

	void MoveRight(float Value);
	void Melee();
	void FireArrow();
	void Blast();
	void Interact();
	bool SpendMP(float Cost);
	void DieAndRespawn();
	void SpawnFlash(const FVector& Location, float Size, const FLinearColor& Color, float Life);
	class APSGameMode* GetPSGameMode() const;
	UStaticMeshComponent* MakePart(const TCHAR* Name, UStaticMesh* MeshAsset,
		const FVector& RelLoc, const FVector& RelScale, const FRotator& RelRot);
	void Tint(UStaticMeshComponent* Comp, const FLinearColor& Color);
};
