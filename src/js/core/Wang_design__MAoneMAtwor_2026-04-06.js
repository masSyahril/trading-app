//===designed by Prof Wang, 2026-Jan-08 in HaNoi International Airport==
//===重新設計===modified on 2026-Apr-06===
//Follow-The-Wave Strategy (FWS策略指標)。此處有MA1與MA2兩條均線
//當股價由下往上突破MA1時買進，當股價由上往下突破MA2時賣出
function MAoneMAtwo(STK_close, day1, day2) {    // day1<day2
  let temp1=Math.min(day1, day2);  //確保day1較小
  let temp2=Math.max(day1, day2);  //確保day2較大
  day1=temp1;   //確保day1比較小
  day2=temp2;   //確保day2比較大
  const MA1 = window.KingMA(STK_close, day1); //例如5天MA1
  const MA2 = window.KingMA(STK_close, day2); //例如10天MA2
  let RR=0;        //報酬率初值=0
  let Acc_RR=0;    //累積報酬率初值=0
  let BS_times=0;  //累積買賣次數=0
  let bs_flag="N"; //初始值表示空手
  let buy_price=0; //買進價格初值=0
  let sell_price=0; //賣出價格初值=0
  //判斷day1=5,第一天是否是買點
  if(STK_close[day1]>MA1[day1]) {   //條件成立，表示買點早已出現
    buy_price=STK_close[day1]; 
    bs_flag="Y";  //表示已買。此列好像可省略
  }
  for(let i=day1+1; i<=STK_close.length; i++) {  //例:i=5+1 to 2000
    if((STK_close[i-1]<MA1[i-1]) & (STK_close[i]>MA1[i]) & bs_flag=="N") {
      buy_price=STK_close[i]; 
      bs_flag="Y"; }
    else if((STK_close[i-1]>MA2[i-1]) & (STK_close[i]<MA2[i])) {
      sell_price=STK_close[i];
      //compute RR, Acc_RR
      RR=(sell_price-buy_price)/buy_price*100;
      Acc_RR=Acc_RR+RR;
      BS_times=BS_times+1;
      bs_flag="N";   //表示空手。此列好像可省略
    }  
  }  
  return {Acc_RR, BS_times, Avg_RR: Acc_RR/BS_times};
  //累積報酬率，累積買賣次數，平均一次報酬率
}
window.MAoneMAtwo=MAoneMAtwo;