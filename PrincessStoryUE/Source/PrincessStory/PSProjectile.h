#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PSProjectile.generated.h"

// 프린세스 애로우 투사체
UCLASS()
class APSProjectile : public AActor
{
	GENERATED_BODY()

public:
	APSProjectile();

	void Init(float DirX, int32 InDamage);

protected:
	virtual void BeginPlay() override;

private:
	UFUNCTION()
	void OnOverlap(UPrimitiveComponent* OverlappedComp, AActor* OtherActor,
		UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	UPROPERTY() TObjectPtr<class USphereComponent> Sphere;
	UPROPERTY() TObjectPtr<UStaticMeshComponent> Vis;
	UPROPERTY() TObjectPtr<class UProjectileMovementComponent> Movement;
	UPROPERTY() TObjectPtr<UMaterialInterface> BaseMaterial;

	int32 Damage = 10;
};
