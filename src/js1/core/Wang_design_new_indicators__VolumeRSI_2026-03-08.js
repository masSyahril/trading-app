//===designed by Prof Wang, 2026-March-08=======
// Volume RSI 成交量相對強弱指標(Volume RSI, Relative Strength Index)
// eVolRSI完全自創指標,completely self-created indicators. 
// 指數平滑移動平均的參數:exponential smoothing parameter(esp)
// 此程式是完整的RSI設計，以此為主。  <2026-Feb-24>
function computeVolumeRSI(K_close, K_vol, RSI_day, esp) {
  // K_close=STK_close, K_vol=STK_vol, RSI_day=5,10,15,..., 例：esp=9
  // First calculate RSI
  const VolRSI=[], eVolRSI=[];
  const dif=[];   //dif=今收盤-昨收盤
  for(let i=2; i<K_close.length; i++) {
    dif[i]=K_close[i]-K_close[i-1];   // dif[]=2,3,...,2000
  }
  //compute the first RSI(). if day=10, RSI()=11,12,...,2000.
  let sum_Up = 0;   //最近 n 日收盤價漲幅之和,改為上漲時成交量累加
  let sum_Dn = 0;   //最近 n 日收盤價跌幅之和,改為下跌時成交量累加
  for(let i=2; i<RSI_day+1; i++) {  //if RSI_day=10 then i=2 to 11
    if(dif[i] > 0) {  //Up
      //sum_Up = sum_Up + dif[i]; }   //收盤價漲幅之和
      sum_Up = sum_Up + K_vol[i]; }    //上漲時成交量累加
    else {            //Down
      //sum_Dn = sum_Dn - dif[i];  //此式是正確的，一定要用負號
      //sum_Dn=sum_Dn+Math.abs(dif[i]);   //收盤價跌幅之和
      sum_Dn=sum_Dn + K_vol[i];        //下跌時成交量累加
    }
  }
  //if RSI_day=10 then first VolRSI value=VolRSI[11]
  if((sum_Up+sum_Dn) === 0) {
    VolRSI[RSI_day+1]=100; }
  else {
    VolRSI[RSI_day+1]=sum_Up/(sum_Up+sum_Dn)*100;
  }
  eVolRSI[RSI_day+1]=VolRSI[RSI_day+1]   //eRSI的初值=eRSI[11]
  //下述程式是計算第2筆之後的RSI值。if RSI_day=10 則第2筆RSI值=RSI[12]
  for(let i=RSI_day+2; i<K_close.length; i++) {  // i=12 to 2000
    // 先加新的成交量(收盤價)差值！
    if(dif[i] > 0) {
      //sum_Up=sum_Up+dif[i]; }           //收盤價漲幅之和
      sum_Up=sum_Up + K_vol[i]; }         //上漲時成交量累加
    else {
      //sum_Dn=sum_Dn+Math.abs(dif[i]);   //收盤價跌幅之和
      sum_Dn=sum_Dn + K_vol[i];           //下跌時成交量累加
    }
    // 再扣除10日前的累加值
    if (dif[i-RSI_day] > 0) {
      //sum_Up=sum_Up-dif[i-RSI_day]; }
      sum_Up=sum_Up - K_vol[i-RSI_day]; }
    else {
      //sum_Dn=sum_Dn+dif[i-RSI_day];  //此式是正確的，一定要用加號
      //sum_Dn=sum_Dn-Math.abs(dif[i-RSI_day]);
      sum_Dn=sum_Dn - K_vol[i-RSI_day];
    }
    //if RSI_day=10 then second RSI value=RSI[12]
    if((sum_Up+sum_Dn) === 0) {  
      VolRSI[i]=100; }
    else {
      VolRSI[i]=sum_Up/(sum_Up+sum_Dn)*100;
    }
    eVolRSI[i]=(esp-1)/(esp+1)*eVolRSI[i-1]+2/(esp+1)*VolRSI[i];
    //eRSI新=(n-1)/(n+1)*eRSI舊+2/(n+1)*RSI新
  }
  //==========此程式是完整的RSI設計，以此為主。  <2026-Feb-24>
  return {VolRSI, eVolRSI};
  // if RSI_day=10 then VolRSI and eVolRSI=11,12,...,2000.
  //drawing the VolRSI and eVolRSI figures in the small windows.
}