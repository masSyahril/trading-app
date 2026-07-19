//designed by Prof Wang, 2026-Jan-18===(modified on 2026-Feb-21, April-02)
//HMA:Hull Moving Average 赫爾移動平均線
function computeHullMA(values, day, esp) {
  //values=STK_close[]
  //The parameter <day> can be 10, 15, 20, 30,...
  //esp=9,指數平滑參數=exponential smoothing parameter(esp),原名ema_n=9
  //例如參數=10:short_day=10/2=5, long_day=10, esp=ema_n=9
  //day需要為偶數,求餘數的指令%
  if(day % 2 ===1) {  //確保day為偶數,Ensure <day> is an even number
    day=day+1;  }
  const WMA1 = [];    //例如5天加權移動平均,天數=day/2
  const WMA2 = [];    //例如10天加權移動平均,天數=day
  const RawHMA = [];  //RawHMA=2*WMA1-WMA2
  const HMA = [];     //HMA=avg(sum(RawHMA), 1 to m), m=sqrt(n)=sqrt(10)
  const eHMA = [];    //eHMA今=eMA(HMA)=(n-1)/(n+1)*eHMA昨+2/(n+1)HMA今
  let half_day=day/2; //WMA1加權移動平均天數
  //----------------------WMA1----------------------------------------
  //計算Weighted WMA1(=1/(n/2)Sum(wi*Ci), for (n/2)_days)
  //每個WMA1權重為:1,2,3,4,5,...,(day/2=half_day)
  //例如day=10,則WMA1[]=5,6,...,2000
  let sum_wgt1=0;              //加總WMA1的總權重,要放分母
  for(let i=1; i<half_day; i++) {
    sum_wgt1=sum_wgt1+i;       //例如=1+2+3+4+5,加總WMA1的總權重,要放分母
  }
  let sum_close=0;   //分子=5天加權收盤價加總
  for(let i=1; i<values.length-half_day+1; i++) {  //i=1 to 1996
    sum_close=0;     //每5天加權收盤價加總之前要歸零
    for(let j=1; j<half_day; j++) {   //j=1 to 5  (j=1 to day/2)
      sum_close=sum_close+values[i+j-1]*j;   //權重係數=1,2,3,4,5
      //WMA1[]= 5 to 2000
    }
    WMA1[i+half_day-1]=sum_close/sum_wgt1;   //第1筆WMA1(1+5-1)=WMA1(5)
  }
  //----------------------WMA2----------------------------------------
  //計算Weighted WMA2(=1/(n)Sum(wi*Ci), for n_days)
  //每個WMA2權重為:1,2,3,4,5,...,day
  //例如day=10,則WMA2[]=10,11,...,2000
  let sum_wgt2=0;         //加總WMA2的總權重,要放分母
  for(let i=1; i<day; i++) {
    sum_wgt2=sum_wgt2+i;  //例如=1+2+...+10,加總WMA2的總權重,要放分母
  }  
  sum_close=0;   //分子=10天加權收盤價加總
  for(let i=1; i<values.length-day+1; i++) {  //i=1 to 1991
    sum_close=0;     //每10天加權收盤價加總之前要歸零
    for(let j=1; j<day; j++) {     //j=1 to 10  (j=1 to day)
      sum_close=sum_close+values[i+j-1]*j;   //權重係數=1,2,...,10
      //WMA2[]= 10 to 2000
    }
    WMA2[i+day-1]=sum_close/sum_wgt2;   //第1筆WMA2(1+10-1)=WMA2(10)
  }
  //----------------------RawHMA-------------------------------------
  //計算RawHMA,從day=10開始,RawHMA=10 to 2000
  for(let i=day; i<values.length; i++) {
    RawHMA[i]=2*WMA1[i]-WMA2[i];
  }

  for (let i = day; i < values.length; i++) {
    RawHMA[i] = 2 * WMA1[i] - WMA2[i];
  }

  const m = Math.ceil(Math.sqrt(day));
  let sum_wgt = 0;
  for (let i = 1; i < m; i++) {
    sum_wgt = sum_wgt + i;
  }
  let sum_tp;
  let count;
  for(let i=day+m-1; i<=values.length; i++) {  //i=(10+4-1),14,...,2000
    sum_tp=0;
    count=1;
    for(let j=i-m+1; j<i; j++) {     //j=10 to 13
      sum_tp=sum_tp+RawHMA[j]*count;  //權重分別=1,2,3,4
      count=count+1;
    }
    HMA[i]=sum_tp/sum_wgt;  //第1個HMA(13)=day+m-1
    if(i===(day+m-1)) {     //初值=第1個eHMA(13)
      eHMA[i]=HMA[i]; }
    else {                  //第2筆之後, =14,15,...,2000
      eHMA[i]=(esp-1)/(esp+1)*eHMA[i-1]+2/(esp+1)*HMA[i];
    }

  }
  return { HMA, eHMA };
  //drawing the STK_close[], HMA[], eHMA[] figures in the small windows.
  //Normally drawing the STK_close[], HMA[], eHMA[] figures in the K-Line area.
  //eg:day=10, half_day=5, m=4, esp=ema_n=9
  //STK_close[]=1,2,...2000 
  //HMA[], eHMA[]= 13 to 2000
}
// Reference / spreadsheet-style (1-based indices, sparse arrays). Do NOT assign
// window.computeHullMA — that overwrites technical-indicators.js and breaks chart alignment.
if (typeof window !== 'undefined') {
  window.computeHullMA = computeHullMA;
}