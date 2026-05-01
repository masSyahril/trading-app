//===designed by Prof Wang, 2026-Jan-29=================================
//鱷魚線(Alligator Indicator)
//藍色顎線(jaw)，紅色齒線(teeth)，綠色唇線(lip)
//分別計算MP的13日平滑移動平均。計算MP的8日平滑移動平均。計算MP的5日平滑移動平均
function computeAlligator(K_high, K_Low) { 
  //K_high=STK_high, K_Low=STK_low
  const Jaw_t=[], Teeth_t=[], Lip_t=[];   //暫時變數
  const Jaw_emp=[], Teeth_emp=[], Lip_emp=[]; //MP的指數平滑移動平均=emp
  let MP=0;   //MP=(High+Low)/2
  //first Jaw_t[1], Teeth_t[1], Jip_t[1]
  MP=(K_high[1]+K_Low[1])/2;
  Jaw_t[1]=MP; 
  Teeth_t[1]=MP; 
  Lip_t[1]=MP;
  //compute the rest values of indicators.   e.g. i=2 to 2000
  for(let i=2; i<=K_high.length; i++) {      // i=2 to 2000  
    MP=(K_high[i]+K_Low[i])/2;
    Jaw_t[i]=(12/14)*Jaw_t[i-1]+(2/14)*MP;   //藍色顎線(jaw)_在下方
    Teeth_t[i]=(7/9)*Teeth_t[i-1]+(2/9)*MP;  //紅色齒線(teeth)_在中間
    Lip_t[i]=(4/6)*Lip_t[i-1]+(2/6)*MP;      //綠色唇線(lip)_在上方
  }
  //多頭時：藍色顎線(jaw)_在下方。紅色齒線(teeth)_在中間。綠色唇線(lip)_在上方
  //取8天前的Jaw_emp值作為當天的藍色顎線值_在下方
  //取5天前的Teeth_emp值作為當天的紅色齒線值_在中間
  //取3天前的Lip_emp值作為當天的綠色唇線值_在上方
  for(let i=4; i<=K_high.length; i++) {   // i=4 to 2000
    Lip_emp[i]=Lip_t[i-3];       //取3天前的Lip值作為當天的綠色唇線值,Lip_emp[4]
    if(i>5) {                    // i=6 to 2000
      Teeth_emp[i]=Teeth_t[i-5]; } //取5天前的Teeth值作為當天的紅色齒線值,Teeth_emp[6]
    if(i>8) {                      // i=9 to 2000
      Jaw_emp[i]=Jaw_t[i-8]; }     //取8天前的Jaw值作為當天的藍色顎線值,Jaw_emp[9]
  }
  //上述整合原本需要用三個LOOP的，變為一個LOOP
  return {Lip_emp, Teeth_emp, Jaw_emp};
  //normally drawing these three indicators in K_Line area
  //in this case, drawing these three indicators and Close_Price in small windows
  //Lip_emp[]=4,...,2000, Teeth_emp[]=6,...,2000, Jaw_emp[]=9,...,2000
}

window.computeAlligator=computeAlligator;