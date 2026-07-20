#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "PSBlock.h"
#include "PSTypes.h"
#include "PSGameMode.generated.h"

// 맵 데이터 정의 + 절차적 레벨 생성 + 맵 이동/리스폰 관리.
// .umap 에셋 없이 빈 엔진 기본 맵 위에 모든 것을 C++로 스폰한다.
UCLASS()
class APSGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	APSGameMode();

	virtual void InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage) override;
	virtual AActor* ChoosePlayerStart_Implementation(AController* Player) override;

	void TravelToMap(int32 MapIndex, float TargetX);
	void TryUsePortal(class APSCharacter* Player);
	void NotifyMonsterKilled(class APSMonster* Monster);
	void RespawnPlayer(APSCharacter* Player);

	const FPSMapDef& GetCurrentMap() const { return Maps[CurrentMapIndex]; }
	int32 CurrentMapIndex = 0;

private:
	void DefineData();
	void SpawnLights();
	void BuildMap(int32 MapIndex);
	void ClearMap();
	void SpawnMonster(int32 TypeIndex, float X);
	APSBlock* SpawnBlock(APSBlock::EShape Shape, const FVector& Center, const FVector& Size,
		const FLinearColor& Color, bool bCollide);
	APSCharacter* GetPlayerChar() const;

	TArray<FPSMapDef> Maps;
	TArray<FPSMonsterTypeDef> MonsterTypes;
	TArray<TWeakObjectPtr<AActor>> MapActors;

	UPROPERTY() TObjectPtr<class APlayerStart> StartSpot;
};
