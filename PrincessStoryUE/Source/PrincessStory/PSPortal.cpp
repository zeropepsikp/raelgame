#include "PSPortal.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

APSPortal::APSPortal()
{
	PrimaryActorTick.bCanEverTick = false;

	Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
	RootComponent = Mesh;
	Mesh->SetMobility(EComponentMobility::Movable);
	Mesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);

	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	static ConstructorHelpers::FObjectFinder<UMaterial> Mat(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	BaseMaterial = Mat.Object;

	if (Cylinder.Object)
	{
		Mesh->SetStaticMesh(Cylinder.Object);
	}
	Mesh->SetRelativeScale3D(FVector(0.9f, 0.9f, 2.3f));
}

void APSPortal::Init(int32 InTargetMap, float InTargetX, const FString& InLabel)
{
	TargetMap = InTargetMap;
	TargetX = InTargetX;
	Label = InLabel;

	if (BaseMaterial)
	{
		UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(BaseMaterial, this);
		MID->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.3f, 0.6f, 1.f));
		Mesh->SetMaterial(0, MID);
	}
}
