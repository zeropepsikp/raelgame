#include "PSProjectile.h"
#include "PSMonster.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/ProjectileMovementComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

APSProjectile::APSProjectile()
{
	PrimaryActorTick.bCanEverTick = false;

	Sphere = CreateDefaultSubobject<USphereComponent>(TEXT("Sphere"));
	RootComponent = Sphere;
	Sphere->InitSphereRadius(16.f);
	Sphere->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	Sphere->SetGenerateOverlapEvents(true);

	static ConstructorHelpers::FObjectFinder<UStaticMesh> SphereMesh(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
	static ConstructorHelpers::FObjectFinder<UMaterial> Mat(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	BaseMaterial = Mat.Object;

	Vis = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Vis"));
	Vis->SetupAttachment(RootComponent);
	if (SphereMesh.Object)
	{
		Vis->SetStaticMesh(SphereMesh.Object);
	}
	Vis->SetRelativeScale3D(FVector(0.3f));
	Vis->SetCollisionEnabled(ECollisionEnabled::NoCollision);

	Movement = CreateDefaultSubobject<UProjectileMovementComponent>(TEXT("Movement"));
	Movement->ProjectileGravityScale = 0.f;
	Movement->InitialSpeed = 1200.f;
	Movement->MaxSpeed = 1200.f;

	InitialLifeSpan = 1.4f;
}

void APSProjectile::Init(float DirX, int32 InDamage)
{
	Damage = InDamage;
	Movement->Velocity = FVector(DirX * 1200.f, 0.f, 0.f);

	if (BaseMaterial)
	{
		UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(BaseMaterial, this);
		MID->SetVectorParameterValue(TEXT("Color"), FLinearColor(1.f, 0.45f, 0.7f));
		Vis->SetMaterial(0, MID);
	}
}

void APSProjectile::BeginPlay()
{
	Super::BeginPlay();
	Sphere->OnComponentBeginOverlap.AddDynamic(this, &APSProjectile::OnOverlap);
}

void APSProjectile::OnOverlap(UPrimitiveComponent* /*OverlappedComp*/, AActor* OtherActor,
	UPrimitiveComponent* /*OtherComp*/, int32 /*OtherBodyIndex*/, bool /*bFromSweep*/, const FHitResult& /*SweepResult*/)
{
	APSMonster* M = Cast<APSMonster>(OtherActor);
	if (M && !M->IsDying())
	{
		const float FromX = GetActorLocation().X - FMath::Sign(Movement->Velocity.X) * 50.f;
		M->ApplyHit(Damage, FromX);
		Destroy();
	}
}
