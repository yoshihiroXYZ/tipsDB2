jQuery("#js-drawer-icon").on("click", function (e) {
  e.preventDefault();
  jQuery("#js-drawer-icon").toggleClass("is-checked");
  jQuery("#js-drawer-content").toggleClass("is-checked");
});

// header scroll func

jQuery(window).on("scroll", function (e) {
  if (80 < jQuery(window).scrollTop()) {
    jQuery("#js-header").addClass("bg");
  } else {
    jQuery("#js-header").removeClass("bg");
  }
});

// //header

(($) => {
  $(".slider").each((_, sliderElement) => {
    const $slider = $(sliderElement);

    /**
     * スライダーのプロパティを格納するオブジェクト
     */
    const props = {
      autoSlideInterval: 4000, // 自動スライドの間隔（ミリ秒単位）
      autoSlideTimer: 0, // 自動スライド用のタイマーID（clearTimeout用）
      current: 0, // 現在表示されているスライドのインデックス
      isAnimating: false, // スライドアニメーションが実行中かどうかのフラグ
      isFlickSlide: false, // フリック動作によるスライドが有効かどうかのフラグ
      isFlickTouch: false, // フリック動作が進行中かどうかを判定するフラグ
      isStart: false, // スライダーがビューポート内で動作を開始したかどうか
      length: 0, // スライドの総数（クローンを含まないオリジナルの数）
      slideDuration: 500, // スライドアニメーションの所要時間（ミリ秒単位）
      slideEasing: "cubic-bezier(0.215, 0.61, 0.355, 1)", // スライドアニメーションのイージング（CSSの値形式）
    };

    /**
     * スライダーの初期化処理を行う関数
     */
    function init() {
      // スライド数を取得
      props.length = $slider.find(".slider-slide").length;

      // 各スライドとそれに対応するサムネイルのHTMLをそれぞれ配列に格納
      let slideArray = [];
      let thumbArray = [];
      for (let i = 0; i < props.length; i++) {
        // スライド本体のHTMLを取得して保存
        slideArray.push($slider.find(".slider-slide:nth-child(" + (i + 1) + ")").prop("outerHTML"));

        // 対応するサムネイルのHTMLを作成して保存（スライド画像を再利用）
        const imgSrc = $slider.find(".slider-slide:nth-child(" + (i + 1) + ") .slider-image img").attr("src");
        thumbArray.push('<div class="slider-thumbnails-slide" data-num="' + i + '"><button type="button" aria-label="スライド' + (i + 1) + 'に移動"><img src="' + imgSrc + '" alt=""></button></div>');
      }

      // ループ再生のため、先頭と末尾にクローンスライドとクローンサムネイルを追加
      let slideFirstHtml = []; // 先頭に追加するためのスライド
      let thumbFirstHtml = []; // 先頭に追加するためのサムネイル
      let slideLastHtml = []; // 末尾に追加するためのスライド
      let thumbLastHtml = []; // 末尾に追加するためのサムネイル

      for (let i = 0; i < 4; i++) {
        // 末尾の4件を取得
        const firstIndex = (props.length * 2 + i - 4) % props.length;
        slideFirstHtml.push(slideArray[firstIndex]);
        thumbFirstHtml.push(thumbArray[firstIndex]);

        // 先頭の4件取得
        const lastIndex = i % props.length;
        slideLastHtml.push(slideArray[lastIndex]);
        thumbLastHtml.push(thumbArray[lastIndex]);
      }

      // クローンスライドと元スライドを結合して表示エリアに挿入
      $slider.find(".slider-items").html(slideFirstHtml.join("") + slideArray.join("") + slideLastHtml.join(""));

      // サムネイル数によって処理を分岐（6個以上でスライド式、5個以下なら固定表示）
      if (props.length > 5) {
        $slider.find(".slider-thumbnails-items").html(thumbFirstHtml.join("") + thumbArray.join("") + thumbLastHtml.join(""));
      } else {
        // 5個以下はループなし・固定レイアウト用クラスを付与
        $slider.find(".slider-thumbnails-items").html(thumbArray.join(""));
        $slider.addClass("is-lte5");
      }

      // 最初のサムネイルにアクティブクラスを付与
      $slider.find('.slider-thumbnails-slide[data-num="0"]').addClass("is-current");

      // トラック全体の幅（クローンを含めた幅）を設定し、初期位置を調整
      $slider.find(".slider-track-wrapper, .slider-thumbnails-track-wrapper").width((props.length + 8) * 100 + "%");
      $slider.find(".slider-track-offset, .slider-thumbnails-track-offset").css({ transform: "translateX(" + (-4 / (props.length + 8)) * 100 + "%)" });

      // スライダーを初期表示する
      $slider.css({ visibility: "visible" });

      // イベントの登録処理を呼び出し
      setupEvents();

      // ビューポート内に入ったときにスライダーを開始
      setupIntersectionObserver();
    }

    /**
     * 各種イベントを登録する関数
     */
    function setupEvents() {
      // 矢印ボタンのクリックイベントを登録
      $slider.find(".slider-nav > button").on("click", (e) => {
        if (!props.isAnimating) {
          const idx = $slider.find(".slider-nav > button").index($(e.currentTarget));
          const direction = idx === 0 ? -1 : 1; // 左: -1, 右: 1
          moveSlide(direction, 0); // 指定方向にスライドを移動
        }
        return false; // クリックイベントの伝播を停止
      });

      // サムネイルのクリックで対応するスライドに移動
      // ※ 6枚以上ある場合はクローン分を考慮して +4 の補正が必要
      $slider.find(".slider-thumbnails-slide > button").on("click", (e) => {
        if (!props.isAnimating) {
          const idx = $slider.find(".slider-thumbnails-slide").index($(e.currentTarget).parent());
          const direction = props.length > 5 ? idx - (props.current + 4) : idx - props.current; // クローンを含む表示インデックスとの差分
          moveSlide(direction, 0); // 指定方向にスライドを移動
        }
        return false; // クリックイベントの伝播を停止
      });

      // フリック操作の開始イベントを登録
      $slider.find(".slider-viewport").on("mousedown touchstart", (e) => {
        if (!props.isAnimating) {
          handleFlick(e); // フリック操作の処理を開始
        }
      });
    }

    /**
     * ビューポートにスライダーが入ったときに自動スライドを開始するための監視を設定
     */
    function setupIntersectionObserver() {
      // Intersection Observerのインスタンスを作成
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // 要素がビューポート内に入ったら、自動スライドを開始
            if (entry.isIntersecting && !props.isStart) {
              props.isStart = true; // スライダーがビューポート内に入ったことを記録
              startTimer(); // 自動スライドを開始
            }
          });
        },
        {
          root: null, // ビューポートを基準に監視
          rootMargin: "0px", // マージンなし
          threshold: 0, // 要素が1ピクセルでも見えたらトリガー
        }
      );

      // スライダーの監視を開始
      observer.observe($slider[0]);
    }

    /**
     * スライダーを指定方向に移動させる
     * @param {number} direction - スライドの方向（右: 1, 左: -1, その場: 0）
     * @param {number} dragOffsetX - ドラッグ操作時のオフセット値（ピクセル単位）
     */
    function moveSlide(direction, dragOffsetX) {
      // アニメーション中はスライドの操作を無効化
      props.isAnimating = true;

      // 次に表示するスライドのインデックスを計算
      let next = props.current + direction;
      if (next >= props.length) next -= props.length; // 最後のスライドから最初に戻る
      if (next < 0) next += props.length; // 最初のスライドから最後に戻る

      // 現在のサムネイルを更新
      $slider.find(".slider-thumbnails-slide.is-current").removeClass("is-current");
      $slider.find('.slider-thumbnails-slide[data-num="' + next + '"]').addClass("is-current");

      // サムネイル1枚ぶんの幅を取得してアニメーションを設定
      const slideW = $slider.find(".slider-thumbnails-slide").outerWidth();
      $slider.find(".slider-thumbnails-items")[0].animate(
        [
          { transform: "translateX(0px)" },
          { transform: "translateX(" + -slideW * direction + "px)" }, // 指定方向に移動
        ],
        {
          duration: props.slideDuration, // アニメーションの時間
          easing: props.slideEasing, // イージング関数
        }
      );

      // スライドの幅を取得してアニメーションを設定
      const areaW = $slider.outerWidth();
      $slider.find(".slider-items")[0].animate(
        [
          { transform: "translateX(" + dragOffsetX + "px)" }, // ドラッグ位置から開始
          { transform: "translateX(" + -areaW * direction + "px)" }, // 指定方向に移動
        ],
        {
          duration: props.slideDuration, // アニメーションの時間
          easing: props.slideEasing, // イージング関数
        }
      ).onfinish = () => {
        // アニメーション完了後にトラック位置を調整
        $slider.find(".slider-track, .slider-thumbnails-track").css({
          transform: "translateX(" + (-next / (props.length + 8)) * 100 + "%)",
        });

        // 一時的なドラッグ位置をリセット
        $slider.find(".slider-items, .slider-thumbnails-items").css({
          transform: "translateX(0px)",
        });

        // 状態を更新
        props.current = next;
        props.isAnimating = false;

        // 自動スライドタイマーを再開
        startTimer();
      };
    }

    /**
     * フリック操作の処理を行う関数
     * @param {Event} e - 発生したイベントオブジェクト
     */
    function handleFlick(e) {
      clearTimeout(props.autoSlideTimer); // 自動スライドのタイマーを停止
      props.isFlickSlide = false; // フリック操作によるスライドの状態をリセット
      props.isFlickTouch = true; // フリック操作中であることをフラグに設定

      // イベントタイプに応じた名前を設定
      const moveEvent = e.type === "touchstart" ? "touchmove.flick" : "mousemove.flick";
      const endEvent = e.type === "touchstart" ? "touchend.flick" : "mouseup.flick mouseleave.flick";
      const origStart = e.type === "touchstart" ? e.originalEvent.changedTouches[0] : e.originalEvent;

      // フリックの初期位置を記録
      const touchPosition = {
        preX: origStart.pageX,
        preY: origStart.pageY,
      };

      $slider.addClass("is-grabbing"); // グラブカーソルを表示

      // フリック中の動作を処理
      $slider.find(".slider-viewport").on(moveEvent, (e) => {
        if (props.isFlickTouch) {
          const origMove = e.type === "touchmove" ? e.originalEvent.changedTouches[0] : e.originalEvent;
          touchPosition.curX = origMove.pageX;
          touchPosition.curY = origMove.pageY;
          touchPosition.diffX = touchPosition.curX - touchPosition.preX;
          touchPosition.diffY = touchPosition.curY - touchPosition.preY;

          // フリック操作が水平方向かどうかを判定
          if (Math.abs(touchPosition.diffY) < Math.max(Math.abs(touchPosition.diffX), 10) || e.type === "mousemove") {
            props.isFlickSlide = true; // フリック操作をスライドとして認識
            e.preventDefault(); // デフォルト動作をキャンセル

            // スライドをドラッグする動きを再現
            $slider.find(".slider-items").css({
              transform: "translateX(" + touchPosition.diffX + "px)",
            });
          } else {
            // 垂直方向の動きや不正な操作は無効化
            props.isFlickSlide = false;
            props.isFlickTouch = false;
            $slider.find(".slider-viewport").off(".flick").removeClass("is-grabbing"); // イベントを解除
            startTimer(); // 自動スライドを再開
          }
        }
      });

      // フリック終了時の処理を登録
      $slider.find(".slider-viewport").on(endEvent, (e) => {
        if (props.isFlickTouch) {
          props.isFlickTouch = false; // フリック操作終了をフラグに設定
          $slider.find(".slider-viewport").off(".flick"); // イベントを解除
          $slider.removeClass("is-grabbing");

          if (props.isFlickSlide) {
            const areaW = $slider.outerWidth(); // スライダーの幅を取得

            // フリック距離に応じてスライドを移動
            if (touchPosition.diffX > areaW / 10) {
              moveSlide(-1, touchPosition.diffX); // 左方向にスライド
              e.preventDefault();
            } else if (touchPosition.diffX < -areaW / 10) {
              moveSlide(1, touchPosition.diffX); // 右方向にスライド
              e.preventDefault();
            } else {
              moveSlide(0, touchPosition.diffX); // 元の位置に戻る
              e.preventDefault();
            }
          } else {
            // フリックとして認識されない場合はタイマーを再開
            startTimer();
          }
        }
      });
    }

    /**
     * 自動スライドのタイマーを開始する関数
     */
    function startTimer() {
      // 既存のタイマーがあればクリア
      clearTimeout(props.autoSlideTimer);

      // タイマーを設定して一定時間後にスライドを移動
      props.autoSlideTimer = setTimeout(() => {
        if (!props.isAnimating) {
          moveSlide(1, 0); // 次のスライドに移動
        }
      }, props.autoSlideInterval); // 指定された間隔で実行
    }

    init(); // 初期化実行
  });
})(jQuery);
