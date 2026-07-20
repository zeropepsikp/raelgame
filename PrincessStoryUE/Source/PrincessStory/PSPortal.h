#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PSPortal.generated.h"

// 맵 이동 포탈 (위쪽 키로 사용)
UCLASS()
class APSPortal : public AActor
{
	GENERATED_BODY()

public:
	APSPortal();

	void Init(int32 InTargetMap, float InTargetX, const FString& InLabel);

	int32 TargetMap = 0;
	float TargetX = 300.f;
	FString Label;

private:
	UPROPERTY() TObjectPtr<UStaticMeshComponent> Mesh;
	UPROPERTY() TObjectPtr<UMaterialInterface> BaseMaterial;
};
