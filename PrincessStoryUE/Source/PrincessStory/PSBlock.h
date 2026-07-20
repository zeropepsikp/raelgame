#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PSBlock.generated.h"

// 엔진 기본 도형(큐브/구/원뿔/원기둥) + 색상만으로 만드는 범용 블록.
// 발판, 배경, 이펙트 등 모든 지오메트리에 사용한다 (에셋 0개 원칙).
UCLASS()
class APSBlock : public AActor
{
	GENERATED_BODY()

public:
	enum class EShape : uint8 { Cube, Sphere, Cone, Cylinder };

	APSBlock();

	// Scale은 액터 스케일(엔진 기본 도형은 100cm 기준이므로 크기/100을 넘긴다)
	void InitShape(EShape Shape, const FVector& Scale, const FLinearColor& Color, bool bCollide);

	UPROPERTY()
	TObjectPtr<UStaticMeshComponent> Mesh;

private:
	UPROPERTY() TObjectPtr<UStaticMesh> CubeMesh;
	UPROPERTY() TObjectPtr<UStaticMesh> SphereMesh;
	UPROPERTY() TObjectPtr<UStaticMesh> ConeMesh;
	UPROPERTY() TObjectPtr<UStaticMesh> CylinderMesh;
	UPROPERTY() TObjectPtr<UMaterialInterface> BaseMaterial;
};
