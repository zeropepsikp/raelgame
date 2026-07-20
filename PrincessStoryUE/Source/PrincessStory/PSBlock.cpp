#include "PSBlock.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

APSBlock::APSBlock()
{
	PrimaryActorTick.bCanEverTick = false;

	Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
	RootComponent = Mesh;
	Mesh->SetMobility(EComponentMobility::Movable);

	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cone(TEXT("/Engine/BasicShapes/Cone.Cone"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	static ConstructorHelpers::FObjectFinder<UMaterial> Mat(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));

	CubeMesh = Cube.Object;
	SphereMesh = Sphere.Object;
	ConeMesh = Cone.Object;
	CylinderMesh = Cylinder.Object;
	BaseMaterial = Mat.Object;

	if (CubeMesh)
	{
		Mesh->SetStaticMesh(CubeMesh);
	}
}

void APSBlock::InitShape(EShape Shape, const FVector& Scale, const FLinearColor& Color, bool bCollide)
{
	UStaticMesh* Selected = CubeMesh;
	switch (Shape)
	{
	case EShape::Sphere:   Selected = SphereMesh;   break;
	case EShape::Cone:     Selected = ConeMesh;     break;
	case EShape::Cylinder: Selected = CylinderMesh; break;
	default: break;
	}

	if (Selected)
	{
		Mesh->SetStaticMesh(Selected);
	}
	SetActorScale3D(Scale);

	if (bCollide)
	{
		Mesh->SetCollisionProfileName(TEXT("BlockAll"));
	}
	else
	{
		Mesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	}

	if (BaseMaterial)
	{
		UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(BaseMaterial, this);
		MID->SetVectorParameterValue(TEXT("Color"), Color);
		Mesh->SetMaterial(0, MID);
	}
}
