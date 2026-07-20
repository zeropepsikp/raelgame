#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "PSHUD.generated.h"

// UMG 에셋 없이 Canvas 드로잉만으로 그리는 HUD.
// (엔진 기본 폰트는 한글 글리프가 없어 표기는 영문 사용)
UCLASS()
class APSHUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void DrawHUD() override;

private:
	void DrawBar(float X, float Y, float W, float H, float Pct,
		const FLinearColor& Fill, const FString& Label, class UFont* Font, float TextScale);
};
