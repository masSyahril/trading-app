//===designed by Prof Wang, 2026-March-10=======
// 漲漲跌百分比價量指標(PVIpercentRiseFall, Price-Volume Indicator of Percentage of Rise and Fall)
// 完全自創指標,completely self-created indicators. 
// 指數平滑移動平均的參數:exponential smoothing parameter(esp)
// if 價格上漲: 分子=sum[(Ct-Ct_1)/Ct_1*Vol]
// if 價格下跌: 分母=sum[abs(Ct-Ct_1)/Ct_1*Vol]
// PVIpercentRiseFall=分子/分母
function computePVIpercentRiseFall(K_close, K_vol, day, esp) {
  // K_close=STK_close, K_vol=STK_vol, day=10,15,..., 例：esp=9
  const PVIpercentRiseFall=[], ePVIpercentRiseFall=[];
  let sum_Up=0;   //分子加總
  let sum_Dn=0;   //分母加總
  for(let i=2; i<=day+1; i++) {    //ex. i=2 to 11
    if(K_close[i]>K_close[i-1]) {  //價格上漲
      sum_Up=sum_Up+(K_close[i]-K_close[i-1])/K_close[i-1]*K_vol[i]; }
    if(K_close[i]<K_close[i-1]) {  //價格下跌
      sum_Dn=sum_Dn+(K_close[i-1]-K_close[i])/K_close[i-1]*K_vol[i]; }
  }
  if(sum_Dn===0) {   //避免分母=0
    PVIpercentRiseFall[day+1]=100; }
  else {
    PVIpercentRiseFall[day+1]=sum_Up/sum_Dn;   //first value=PVIpercentRiseFall[11]
  }
  ePVIpercentRiseFall[day+1]=PVIpercentRiseFall[day+1]; //first value=PVIpercentRiseFall[11]
  //calculate the remaining values
  for(let i=day+2; i<=K_close.length; i++) {  //ex. i=12 to 2000
    //先減舊的
    if(K_close[i-day]>K_close[i-day-1]) {  //價格上漲
      sum_Up=sum_Up-(K_close[i-day]-K_close[i-day-1])/K_close[i-day-1]*K_vol[i-day]; }
    if(K_close[i-day]<K_close[i-day-1]) {  //價格下跌
      sum_Dn=sum_Dn+(K_close[i-day-1]-K_close[i-day])/K_close[i-day-1]*K_vol[i-day]; }
    //再加新的
    if(K_close[i]>K_close[i-1]) {  //價格上漲
      sum_Up=sum_Up+(K_close[i]-K_close[i-1])/K_close[i-1]*K_vol[i]; }
    if(K_close[i]<K_close[i-1]) {  //價格下跌
      sum_Dn=sum_Dn+(K_close[i-1]-K_close[i])/K_close[i-1]*K_vol[i]; }
    if(sum_Dn===0) {   //避免分母=0
      PVIpercentRiseFall[i]=100; }
    else {
      PVIpercentRiseFall[i]=sum_Up/sum_Dn;   //second value=PVIpercentRiseFall[12]
    }
    ePVIpercentRiseFall[i]=(esp-1)/(esp+1)*ePVIpercentRiseFall[i-1]+2/(esp+1)*PVIpercentRiseFall[i];
  }
  return { PVIpercentRiseFall, ePVIpercentRiseFall };
  // if day=10 then PVIpercentRiseFall and ePVIpercentRiseFall =11,12,...,2000.
  // drawing the PVIpercentRiseFall and ePVIpercentRiseFall figures in the small windows.
}

window.computePVIpercentRiseFall = computePVIpercentRiseFall;