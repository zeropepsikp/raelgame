#include "PSMonster.h"
#include "PSCharacter.h"
#include "PSGameMode.h"
#include "AIController.h"
#include "Components/CapsuleComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

APSMonster::APSMonster()
{
	PrimaryActorTick.bCanEverTick = true;

	AutoPossessAI = EAutoPossessAI::PlacedInWorldOrSpawned;
	AIControllerClass = AAIController::StaticClass();

	GetCapsuleComponent()->SetCapsuleSize(45.f, 45.f);
	GetCapsuleComponent()->SetCollisionResponseToChannel(ECC_Pawn, ECR_Ignore);

	UCharacterMovementComponent* Move = GetCharacterMovement();
	Move->bConstrainToPlane = true;
	Move->SetPlaneConstraintNormal(FVector(0.f, 1.f, 0.f));
	Move->bOrientRotationToMovement = false;
	Move->GravityScale = 2.0f;

	bUseControllerRotationYaw = false;

	static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
	static ConstructorHelpers::FObjectFinder<UMaterial> Mat(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	BaseMaterial = Mat.Object;

	Body = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Body"));
	Body->SetupAttachment(RootComponent);
	if (Sphere.Object)
	{
		Body->SetStaticMesh(Sphere.Object);
	}
	Body->SetCollisionEnabled(ECollisionEnabled::NoCollision);

	// 눈 두 개는 카메라 쪽(+Y)을 바라본다
	auto MakeEye = [this, &Sphere](const TCHAR* Name, float OffsetX) -> UStaticMeshComponent*
	{
		UStaticMeshComponent* Eye = CreateDefaultSubobject<UStaticMeshComponent>(Name);
		Eye->SetupAttachment(Body);
		if (Sphere.Object)
		{
			Eye->SetStaticMesh(Sphere.Object);
		}
		Eye->SetRelativeLocation(FVector(OffsetX, 42.f, 14.f));
		Eye->SetRelativeScale3D(FVector(0.14f));
		Eye->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		return Eye;
	};
	EyeL = MakeEye(TEXT("EyeL"), -18.f);
	EyeR = MakeEye(TEXT("EyeR"), 18.f);
}

void APSMonster::InitFromDef(const FPSMonsterTypeDef& Def, int32 InTypeIndex, float InHomeX)
{
	MonsterName = Def.Name;
	MaxHP = Def.MaxHP;
	HP = MaxHP;
	TouchDamage = Def.Damage;
	ExpReward = Def.Exp;
	MesoReward = Def.Meso;
	bBoss = Def.bBoss;
	bAggressive = Def.bAggressive;
	TypeIndex = InTypeIndex;
	HomeX = InHomeX;
	BaseColor = Def.Color;
	BodyScale = Def.Scale;

	GetCapsuleComponent()->SetCapsuleSize(46.f * BodyScale, 46.f * BodyScale);
	Body->SetRelativeScale3D(FVector(0.92f * BodyScale));
	GetCharacterMovement()->MaxWalkSpeed = Def.Speed;

	if (BaseMaterial)
	{
		BodyMID = UMaterialInstanceDynamic::Create(BaseMaterial, this);
		BodyMID->SetVectorParameterValue(TEXT("Color"), BaseColor);
		Body->SetMaterial(0, BodyMID);

		UMaterialInstanceDynamic* EyeMID = UMaterialInstanceDynamic::Create(BaseMaterial, this);
		EyeMID->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.05f, 0.05f, 0.08f));
		EyeL->SetMaterial(0, EyeMID);
		EyeR->SetMaterial(0, EyeMID);
	}
}

void APSMonster::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (bDying)
	{
		return;
	}

	float Dir = PatrolDir;
	if (APawn* P = UGameplayStatics::GetPlayerPawn(this, 0))
	{
		const FVector D = P->GetActorLocation() - GetActorLocation();

		if (bAggressive && FMath::Abs(D.X) < 650.f && FMath::Abs(D.Z) < 220.f)
		{
			Dir = (D.X >= 0.f) ? 1.f : -1.f;
		}
		else
		{
			const float X = GetActorLocation().X;
			if (X > HomeX + 300.f)
			{
				PatrolDir = -1.f;
			}
			else if (X < HomeX - 300.f)
			{
				PatrolDir = 1.f;
			}
			Dir = PatrolDir;
		}

		// 접촉 데미지
		if (FMath::Abs(D.X) < 46.f * BodyScale + 45.f && FMath::Abs(D.Z) < 110.f)
		{
			if (APSCharacter* C = Cast<APSCharacter>(P))
			{
				C->ReceiveMonsterHit(TouchDamage, GetActorLocation().X);
			}
		}
	}
	AddMovementInput(FVector(Dir, 0.f, 0.f));

	if (HitFlash > 0.f && BodyMID)
	{
		HitFlash = FMath::Max(0.f, HitFlash - DeltaSeconds);
		const float A = FMath::Clamp(HitFlash / 0.15f, 0.f, 1.f);
		BodyMID->SetVectorParameterValue(TEXT("Color"), FMath::Lerp(BaseColor, FLinearColor::White, A));
	}
}

void APSMonster::ApplyHit(int32 Damage, float FromX)
{
	if (bDying)
	{
		return;
	}

	HP -= Damage;
	HitFlash = 0.15f;

	float Dir = FMath::Sign(GetActorLocation().X - FromX);
	if (Dir == 0.f)
	{
		Dir = 1.f;
	}
	LaunchCharacter(FVector(Dir * 260.f, 0.f, 240.f), true, true);

	if (HP <= 0)
	{
		bDying = true;
		if (APSGameMode* GM = GetWorld()->GetAuthGameMode<APSGameMode>())
		{
			GM->NotifyMonsterKilled(this);
		}
		Destroy();
	}
}
