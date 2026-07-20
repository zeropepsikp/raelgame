#include "PSCharacter.h"
#include "PSBlock.h"
#include "PSGameMode.h"
#include "PSMonster.h"
#include "PSProjectile.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "EngineUtils.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

APSCharacter::APSCharacter()
{
	PrimaryActorTick.bCanEverTick = true;

	GetCapsuleComponent()->SetCapsuleSize(30.f, 60.f);

	static ConstructorHelpers::FObjectFinder<UStaticMesh> SphereMesh(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> ConeMesh(TEXT("/Engine/BasicShapes/Cone.Cone"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderMesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	static ConstructorHelpers::FObjectFinder<UMaterial> Mat(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	BaseMaterial = Mat.Object;

	// 원뿔 드레스 + 구 머리 + 왕관 + 검: 엔진 기본 도형만으로 만든 프린세스
	Dress = MakePart(TEXT("Dress"), ConeMesh.Object, FVector(0, 0, -18), FVector(0.62f, 0.62f, 0.75f), FRotator::ZeroRotator);
	Head  = MakePart(TEXT("Head"), SphereMesh.Object, FVector(0, 0, 42), FVector(0.42f), FRotator::ZeroRotator);
	Hair  = MakePart(TEXT("Hair"), SphereMesh.Object, FVector(0, -10, 50), FVector(0.48f), FRotator::ZeroRotator);
	Crown = MakePart(TEXT("Crown"), ConeMesh.Object, FVector(0, 0, 76), FVector(0.18f, 0.18f, 0.22f), FRotator::ZeroRotator);
	Sword = MakePart(TEXT("Sword"), CylinderMesh.Object, FVector(38, 0, 8), FVector(0.07f, 0.07f, 0.55f), FRotator(90.f, 0.f, 0.f));

	UCharacterMovementComponent* Move = GetCharacterMovement();
	Move->bConstrainToPlane = true;
	Move->SetPlaneConstraintNormal(FVector(0.f, 1.f, 0.f));
	Move->GravityScale = 2.0f;
	Move->JumpZVelocity = 850.f;
	Move->AirControl = 0.7f;
	Move->MaxWalkSpeed = 480.f;
	Move->bOrientRotationToMovement = true;
	Move->RotationRate = FRotator(0.f, 720.f, 0.f);

	bUseControllerRotationYaw = false;

	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->SetUsingAbsoluteRotation(true);
	CameraBoom->SetRelativeRotation(FRotator(-8.f, -90.f, 0.f));
	CameraBoom->TargetArmLength = 950.f;
	CameraBoom->bDoCollisionTest = false;
	CameraBoom->SocketOffset = FVector(0.f, 0.f, 120.f);

	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
	Camera->SetupAttachment(CameraBoom);
	Camera->bUsePawnControlRotation = false;
}

UStaticMeshComponent* APSCharacter::MakePart(const TCHAR* Name, UStaticMesh* MeshAsset,
	const FVector& RelLoc, const FVector& RelScale, const FRotator& RelRot)
{
	UStaticMeshComponent* Comp = CreateDefaultSubobject<UStaticMeshComponent>(Name);
	Comp->SetupAttachment(RootComponent);
	if (MeshAsset)
	{
		Comp->SetStaticMesh(MeshAsset);
	}
	Comp->SetRelativeLocation(RelLoc);
	Comp->SetRelativeScale3D(RelScale);
	Comp->SetRelativeRotation(RelRot);
	Comp->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	return Comp;
}

void APSCharacter::Tint(UStaticMeshComponent* Comp, const FLinearColor& Color)
{
	if (!Comp || !BaseMaterial)
	{
		return;
	}
	UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(BaseMaterial, this);
	MID->SetVectorParameterValue(TEXT("Color"), Color);
	Comp->SetMaterial(0, MID);
}

void APSCharacter::BeginPlay()
{
	Super::BeginPlay();

	Tint(Dress, FLinearColor(1.f, 0.5f, 0.7f));
	Tint(Head, FLinearColor(1.f, 0.87f, 0.78f));
	Tint(Hair, FLinearColor(1.f, 0.84f, 0.43f));
	Tint(Crown, FLinearColor(1.f, 0.83f, 0.22f));
	Tint(Sword, FLinearColor(0.85f, 0.88f, 0.94f));

	AddNotice(TEXT("Welcome to Princess Story!"));
}

void APSCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	PlayerInputComponent->BindAxis(TEXT("MoveRight"), this, &APSCharacter::MoveRight);
	PlayerInputComponent->BindAction(TEXT("Jump"), IE_Pressed, this, &ACharacter::Jump);
	PlayerInputComponent->BindAction(TEXT("Jump"), IE_Released, this, &ACharacter::StopJumping);
	PlayerInputComponent->BindAction(TEXT("Attack"), IE_Pressed, this, &APSCharacter::Melee);
	PlayerInputComponent->BindAction(TEXT("Arrow"), IE_Pressed, this, &APSCharacter::FireArrow);
	PlayerInputComponent->BindAction(TEXT("Blast"), IE_Pressed, this, &APSCharacter::Blast);
	PlayerInputComponent->BindAction(TEXT("Interact"), IE_Pressed, this, &APSCharacter::Interact);
}

void APSCharacter::MoveRight(float Value)
{
	AddMovementInput(FVector(1.f, 0.f, 0.f), Value);
	if (FMath::Abs(Value) > 0.2f)
	{
		FacingX = (Value > 0.f) ? 1.f : -1.f;
	}
}

APSGameMode* APSCharacter::GetPSGameMode() const
{
	return GetWorld() ? GetWorld()->GetAuthGameMode<APSGameMode>() : nullptr;
}

void APSCharacter::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	MP = FMath::Min(MaxMP, MP + 3.f * DeltaSeconds);
	HP = FMath::Min(MaxHP, HP + 0.8f * DeltaSeconds);

	// 맵 경계 클램프 + 추락 처리
	if (const APSGameMode* GM = GetPSGameMode())
	{
		const float Len = GM->GetCurrentMap().Length;
		FVector Loc = GetActorLocation();
		const float ClampedX = FMath::Clamp(Loc.X, 60.f, Len - 60.f);
		if (ClampedX != Loc.X)
		{
			Loc.X = ClampedX;
			SetActorLocation(Loc);
		}
		if (Loc.Z < -600.f)
		{
			DieAndRespawn();
		}
	}

	// 피격 무적 동안 깜빡임
	const double Now = GetWorld()->GetTimeSeconds();
	if (Now < InvulnUntil)
	{
		SetActorHiddenInGame(FMath::Fmod(Now, 0.2) < 0.1);
	}
	else
	{
		SetActorHiddenInGame(false);
	}
}

int32 APSCharacter::ExpNeedFor(int32 InLevel)
{
	return FMath::RoundToInt(25.f * FMath::Pow(static_cast<float>(InLevel), 1.55f)) + 15;
}

void APSCharacter::GainExp(int32 Amount)
{
	Exp += Amount;
	while (Exp >= ExpNeedFor(Level))
	{
		Exp -= ExpNeedFor(Level);
		Level++;
		MaxHP += 14.f;
		MaxMP += 6.f;
		HP = MaxHP;
		MP = MaxMP;
		AddNotice(FString::Printf(TEXT("LEVEL UP! Lv.%d"), Level));
	}
}

void APSCharacter::GainMeso(int32 Amount)
{
	Meso += Amount;
}

void APSCharacter::AddNotice(const FString& Text)
{
	FPSNotice N;
	N.Text = Text;
	N.Time = GetWorld() ? GetWorld()->GetTimeSeconds() : 0.0;
	Notices.Add(N);
	if (Notices.Num() > 8)
	{
		Notices.RemoveAt(0, Notices.Num() - 8);
	}
}

bool APSCharacter::SpendMP(float Cost)
{
	if (MP < Cost)
	{
		AddNotice(TEXT("Not enough MP!"));
		return false;
	}
	MP -= Cost;
	return true;
}

void APSCharacter::SpawnFlash(const FVector& Location, float Size, const FLinearColor& Color, float Life)
{
	if (APSBlock* B = GetWorld()->SpawnActor<APSBlock>(Location, FRotator::ZeroRotator))
	{
		B->InitShape(APSBlock::EShape::Sphere, FVector(Size / 100.f), Color, false);
		B->SetLifeSpan(Life);
	}
}

void APSCharacter::Melee()
{
	const double Now = GetWorld()->GetTimeSeconds();
	if (Now - LastMeleeTime < 0.45)
	{
		return;
	}
	LastMeleeTime = Now;

	SpawnFlash(GetActorLocation() + FVector(FacingX * 120.f, 0.f, 10.f), 45.f, FLinearColor(1.f, 1.f, 0.85f), 0.08f);

	for (TActorIterator<APSMonster> It(GetWorld()); It; ++It)
	{
		APSMonster* M = *It;
		if (!IsValid(M) || M->IsDying())
		{
			continue;
		}
		const FVector D = M->GetActorLocation() - GetActorLocation();
		if (D.X * FacingX > -20.f && FMath::Abs(D.X) < 170.f && FMath::Abs(D.Z) < 130.f)
		{
			const bool bCrit = FMath::FRand() < 0.15f;
			const float Base = (9.f + Level * 2.f) * FMath::FRandRange(0.85f, 1.15f);
			M->ApplyHit(FMath::RoundToInt(Base * (bCrit ? 1.6f : 1.f)), GetActorLocation().X);
		}
	}
}

void APSCharacter::FireArrow()
{
	const double Now = GetWorld()->GetTimeSeconds();
	if (Now - LastArrowTime < 0.6 || !SpendMP(8.f))
	{
		return;
	}
	LastArrowTime = Now;

	FActorSpawnParameters Params;
	Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	Params.Owner = this;
	const FVector SpawnLoc = GetActorLocation() + FVector(FacingX * 70.f, 0.f, 12.f);
	if (APSProjectile* P = GetWorld()->SpawnActor<APSProjectile>(SpawnLoc, FRotator::ZeroRotator, Params))
	{
		P->Init(FacingX, FMath::RoundToInt(14.f + Level * 2.5f));
	}
}

void APSCharacter::Blast()
{
	const double Now = GetWorld()->GetTimeSeconds();
	if (Now - LastBlastTime < 1.2 || !SpendMP(25.f))
	{
		return;
	}
	LastBlastTime = Now;

	SpawnFlash(GetActorLocation(), 850.f, FLinearColor(1.f, 0.85f, 0.3f), 0.22f);

	for (TActorIterator<APSMonster> It(GetWorld()); It; ++It)
	{
		APSMonster* M = *It;
		if (!IsValid(M) || M->IsDying())
		{
			continue;
		}
		if (FVector::Dist2D(M->GetActorLocation(), GetActorLocation()) < 460.f)
		{
			const float Base = (30.f + Level * 3.f) * FMath::FRandRange(0.9f, 1.1f);
			M->ApplyHit(FMath::RoundToInt(Base), GetActorLocation().X);
		}
	}
}

void APSCharacter::Interact()
{
	if (APSGameMode* GM = GetPSGameMode())
	{
		GM->TryUsePortal(this);
	}
}

void APSCharacter::ReceiveMonsterHit(int32 Damage, float FromX)
{
	const double Now = GetWorld()->GetTimeSeconds();
	if (Now < InvulnUntil || HP <= 0.f)
	{
		return;
	}

	const float Reduced = FMath::Max(1.f, Damage * (1.f - FMath::Min(0.5f, Level * 0.01f)));
	HP -= Reduced;
	InvulnUntil = Now + 1.0;

	float Dir = FMath::Sign(GetActorLocation().X - FromX);
	if (Dir == 0.f)
	{
		Dir = 1.f;
	}
	LaunchCharacter(FVector(Dir * 420.f, 0.f, 430.f), true, true);

	if (HP <= 0.f)
	{
		DieAndRespawn();
	}
}

void APSCharacter::DieAndRespawn()
{
	Exp = FMath::Max(0, Exp * 95 / 100);
	HP = MaxHP * 0.5f;
	MP = MaxMP * 0.5f;
	AddNotice(TEXT("You died... respawned at map start (-5% EXP)"));
	if (APSGameMode* GM = GetPSGameMode())
	{
		GM->RespawnPlayer(this);
	}
}
