
//Initialize Script variables
var yearSecs = 31556926;//Number of seconds in a year (365.24 days)
var monthSecs = 2629743;//Number of seconds in a (rounded) month
var daySecs = 86400;//Number of seconds in a day
var hourSecs = 3600;//Number of seconds in an hour
var minuteSecs = 60;//Number of seconds in a minute
var UTCStamp = 0;//Holds UTC TimeUTCStamp for date calculation
var UTCOffset = 0;//Holds UTC Time UTCOffset for local synchronization
var frameTicker = 0;//Used to count frames for clip reset
var counter = 0;//Used for loop iteration
var stripArray = [];//Used to construct SysEx commands for scribble strip updates
var rate = 30;//Update rate in Hz or FPS
//Force Script update rate to 30, as default is 50 and it is not editable when connected to a module
script.setUpdateRate(rate);

function init()
{
   //Synchronize Arrays 1-7
    for(counter=0;counter<8;counter++){
        //Init Motor Fader Positions
        local.sendPitchWheel(counter+1,local.values.strips.getChild('Strip '+(counter+1)).fader.get()*16383);
        //Pulse VU Meters at current value
        local.sendChannelPressure(counter+1,local.values.strips.getChild('Strip '+(counter+1)).meter.get()*14+(16*(counter)));
        //Init POT LEDs
        if(((local.values.strips.getChild('Strip '+(counter+1)).potMode.get()-1)/16==3)||((local.values.strips.getChild('Strip '+(counter+1)).potMode.get()-1)/16==7)){     
            local.sendCC(0,0x30+index,(local.values.strips.getChild('Strip '+(counter+1)).potVal.get()*5)+(local.values.strips.getChild('Strip '+(counter+1)).potMode.get()));
        }else{
            local.sendCC(0,0x30+counter,(local.values.strips.getChild('Strip '+(counter+1)).potVal.get()*11)+(local.values.strips.getChild('Strip '+(counter+1)).potMode.get()));
        }
       // local.sendCC(0,0x30+(counter), (local.values.strips.getChild('Strip '+(counter+1)).potVal.get()*12)+local.values.strips.getChild('Strip '+(counter+1)).potMode.getData());
        //Init Select LEDs
        local.sendNoteOn(1,counter+22,local.values.strips.getChild('Strip '+(counter+1)).select.get());
         //Calculate Top Scribble Strip Array
        stripArray[counter]=local.values.strips.getChild('Strip '+(counter+1)).encoderName.get();
        if ((stripArray[counter].length)>7){
            stripArray[counter]=stripArray[counter].substring(0,7);
        }else{
            while((stripArray[counter].length)<7){
                stripArray[counter]+=" ";
            }
        } 
    }
    //Synchronize Arrays 8-15
    for(counter=8;counter<16;counter++){
       //Calculate Bottom Sysex
        stripArray[counter]=local.values.strips.getChild('Strip '+(counter-7)).faderName.get();
        if ((stripArray[counter].length)>7){
            stripArray[counter]=stripArray[counter].substring(0,7);
        }else{
            while((stripArray[counter].length)<7){
                stripArray[counter]+=" ";
            }
        } 
    }
    //Send Assembled String Array to scribble strips
    local.sendSysex(0x00,0x00,0x66,0x14,0x12,0x00,stripArray);

    //Calculate Clock Values
    UTCOffset = (yearSecs*1970) + (hourSecs*-1)+(minuteSecs*-21) - 39;
    UTCStamp = util.getTimestamp();
    hours = Math.round(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)/hourSecs));
    //Output Hours Digits
    local.sendCC(1, 71, 48+Math.round(Math.floor(hours%10)));
    local.sendCC(1, 72, 48+Math.round(Math.floor(hours/10)));
    minutes = Math.round(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs/minuteSecs));
    //Output Minutes Digits
    local.sendCC(1, 69, 48+Math.round(Math.floor(minutes%10)));
    local.sendCC(1, 70, 48+Math.round(Math.floor(minutes/10)));
    seconds = Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)%minuteSecs));
    //Output Seconds Digits
    local.sendCC(1, 67, 48+Math.round(Math.floor(seconds%10)));
    local.sendCC(1, 68, 48+Math.round(Math.floor(seconds/10)));
}

//Some script parameter has changed
//I think only file path and update rate can even trigger this now
function scriptParameterChanged(param)
{
    
}

function update(deltaTime)
{
    //Get current UTC timestamp
    UTCStamp = util.getTimestamp();
    //Unused calculations for years and days based on UTC stamp
    //var years = Math.round(Math.floor((UTCStamp+UTCOffset)/yearSecs));
    //var days = Math.round(Math.floor(((UTCStamp+UTCOffset)%yearSecs)/daySecs));
   
    //Is calculated 'hours' value different from the displayed one?
    if(hours!=Math.round(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)/hourSecs))){
        hours = Math.round(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)/hourSecs));
        local.sendCC(1, 71, 48+Math.round(Math.floor(hours%10)));
        local.sendCC(1, 72, 48+Math.round(Math.floor(hours/10)));
    }
    //Is calculated 'minutes' value different form the displayed one?
    if(minutes!=Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)/minuteSecs))){
        minutes = Math.round(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs/minuteSecs));
        local.sendCC(1, 69, 48+Math.round(Math.floor(minutes%10)));
        local.sendCC(1, 70, 48+Math.round(Math.floor(minutes/10)));
    }
    //Is calculated 'seconds' value different from the displayed one?
    if(seconds!=Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)%minuteSecs))){
        
        seconds = Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)%minuteSecs));
        local.sendCC(1, 67, 48+Math.round(Math.floor(seconds%10)));
        local.sendCC(1, 68, 48+Math.round(Math.floor(seconds/10)));
    }
    //Advance our frame counter
    frameTicker++;
    //Have we reached our tick threshold?
    if (frameTicker>rate*1.5){
        frameTicker = 0;
        var i;
        //Clear VU Meter 'Clip' LEDs once every 45 updates
        for(i=0;i<8;i++){
            local.sendChannelPressure(1,15+(16*i));
        }
    }
}

//****MODULE SPECIFIC SCRIPTS********** */

function moduleParameterChanged(param)
{
    if(param.isParameter())
    {
        //Did we change the selected strip?
        if(param.name=="stripIndex"){
            var i;
            for(i=0;i<8;i++){
                if((param.get()==0)||(i+1!=param.get())){
                    //select[i].set("Off");
                    local.values.strips.getChild('Strip '+(i+1)).select.set("off");
                }else{
                    // select[i].set("Solid");
                    local.values.strips.getChild('Strip '+(i+1)).select.set("on");
                }
            }
        }
        //Did we change the activeView ?
        if(param.name=="activeView"){
            var i;
            for(i=0;i<8;i++){
                if((param.get()==0)||(i+1!=param.get())){
                    //select[i].set("Off");
                    local.values.strips.getChild('Strip '+(i+1)).view.set("off");
                }else{
                    // select[i].set("Solid");
                    local.values.strips.getChild('Strip '+(i+1)).view.set("on");
                }
            }
        }
        
    }
}


function moduleValueChanged(value)
{
    if(value.isParameter())
    {
        if(value.name=="fader"){
            local.sendPitchWheel(parseInt(value.getParent().name.substring(5,6)),value.get()*16383);
        }else{
            if(value.name=="meter"){
                local.sendChannelPressure(1,(value.get()*14)+((parseInt(value.getParent().name.substring(5,6))-1)*16));
                //local.values.strips.getChild('Strip '+counter).meter.get()*14+(16*(counter-1)
            }else{
                if(value.name=="select"){
                    local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))+23,value.get());
                }else{
                    if(value.name=="potVal"||value.name=="potMode"){
                        index = parseInt(value.getParent().name.substring(5,6))-1;
                        if(((local.values.strips.getChild('Strip '+(index+1)).potMode.get()-1)/16==3)||((local.values.strips.getChild('Strip '+(index+1)).potMode.get()-1)/16==7)){
                            
                            local.sendCC(0,0x30+index,(local.values.strips.getChild('Strip '+(index+1)).potVal.get()*5)+(local.values.strips.getChild('Strip '+(index+1)).potMode.get()));
                        }else{
                            local.sendCC(0,0x30+index,(local.values.strips.getChild('Strip '+(index+1)).potVal.get()*11)+(local.values.strips.getChild('Strip '+(index+1)).potMode.get()));
                        }
                        
                    }else{
                        if(value.name=="encoderName"){
                            // Update display with new encoder name
                            var index = parseInt(value.getParent().name.substring(1,2))-1;
                            var newLabel = value.get();
                            var short = 7-newLabel.length;
                            var i;
                            for (i=0;i<short;i++){
                                newLabel = newLabel+" ";
                            }
                            if(short>0){
                                local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7),newLabel);
                            }else{
                                local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7),newLabel.substring(0,7));
                            }
                                
                        }else{
                            if(value.name=="faderName"){
                                var index = parseInt(value.getParent().name.substring(1,2))-1;
                                var newLabel = value.get();
                                var short = 7-newLabel.length;
                                var i;
                                for (i=0;i<short;i++){
                                    newLabel = newLabel+" ";
                                }
                                if(short>0){
                                    local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7+56),newLabel);
                                }else{
                                    local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7)+56,newLabel.substring(0,7));
                                }
                            }else{
                                if(value.name=="solo"){
                                    local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))+7,value.get());
                                }else{
                                    if(value.name=="mute"){
                                        local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))+15,value.get());
                                    }else{
                                        if(value.name=="rec"){
                                            local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))-1,value.get());
                                        }else{
                                            if(value.name=="func"){
                                                local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))+53,value.get());
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }else 
    {
        //script.log("Module value triggered : "+value.name);   
    }
}


//*****MIDI MODULE SPECIFIC SCRIPTS*****

function noteOnEvent(channel, pitch, velocity)
{
    // Is it a 'Rec' button ?
    if (pitch >= 0 && pitch <= 7){
        var index = pitch;
        if (local.values.strips.getChild('Strip '+(index+1)).rec.get()==0){
            local.values.strips.getChild('Strip '+(index+1)).rec.set("on");
        }else{
            local.values.strips.getChild('Strip '+(index+1)).rec.set("off");
        }
    }

    //Is it a 'Solo' button ?
    if (pitch >= 8 && pitch <= 15){
        //Change solo strip state
        var index = pitch-8;
        if (local.values.strips.getChild('Strip '+(index+1)).solo.get()==0){
            script.log(local.parameters.flashOnSolo.get());
            if (local.parameters.flashOnSolo.get()){local.values.strips.getChild('Strip '+(index+1)).solo.set("flash");}
            else {local.values.strips.getChild('Strip '+(index+1)).solo.set("on");}
        }else{
            local.values.strips.getChild('Strip '+(index+1)).solo.set("off");
        }
    }

    //Is it a 'Mute' button ?
    if (pitch >= 16 && pitch <= 23){
        // Change mute strip state
        var index = pitch-16;
        if (local.values.strips.getChild('Strip '+(index+1)).mute.get()==0){
            local.values.strips.getChild('Strip '+(index+1)).mute.set("on");
        }else{
            local.values.strips.getChild('Strip '+(index+1)).mute.set("off");
        }
    }

    //Is it a 'Select' button?
    if (pitch >= 24 && pitch <= 31){
        //Set new selected strip value    
        local.parameters.stripIndex.set(pitch-23);
    }
    
    //Is it a 'Move' button?
    if (pitch >= 46 && pitch <= 49){
        if (pitch == 46) {script.log("Bank Low");}
        if (pitch == 47) {script.log("Bank Up");}
        if (pitch == 48) {script.log("Chan Low");}
        if (pitch == 49) {script.log("Chan Up");}
    }
    
    //Is it a 'Function' button ?
    if (pitch >= 54 && pitch <= 61){
        // Change function strip state
        var index = pitch-54;
        if (local.values.strips.getChild('Strip '+(index+1)).func.get()==0){
            local.values.strips.getChild('Strip '+(index+1)).func.set("on");
        }else{
            local.values.strips.getChild('Strip '+(index+1)).func.set("off");
        }
    }
    
    //Is it a 'View' button ?
    if (pitch >= 62 && pitch <= 69){
        // Set new view value
        local.parameters.activeView.set(pitch-61);
    }

    //Is it a 'Transport' button?
    if (pitch >= 91 && pitch <= 95){
        if (pitch == 91) {script.log("Rewind");}
        if (pitch == 92) {script.log("Fast Forward");}
        if (pitch == 93) {script.log("Stop");}
        if (pitch == 94) {script.log("Play");}
        if (pitch == 95) {script.log("Rec");}
    }

    //Is it a 'Arrow' button?
    if (pitch >= 94 && pitch <= 99){
        if (pitch == 96) {script.log("Up");}
        if (pitch == 97) {script.log("Down");}
        if (pitch == 98) {script.log("Left");}
        if (pitch == 99) {script.log("Right");}
    }

    //Is it a fader touch?
    if (pitch >= 104 && pitch <= 111 && local.parameters.flashOnTouched.get()){
        var index = pitch-104;
        local.values.strips.getChild('Strip '+(index+1)).touch.set(true);
        local.values.strips.getChild('Strip '+(index+1)).select.set("flash");
    }



}

function noteOffEvent(channel, pitch, velocity)
{
    //Is it a fader touch release?
    if (pitch >= 104 && pitch <= 111){
        var index = pitch-104;
        //Release touched boolean
        local.values.strips.getChild('Strip '+(index+1)).touch.set(false);
        //If this strip is selected
        if(local.parameters.stripIndex.get()==index+1){
            //Set light to solid
            local.values.strips.getChild('Strip '+(index+1)).select.set("on");
        }else{
            //Set Light off
            local.values.strips.getChild('Strip '+(index+1)).select.set("off");
        }
    }
    //script.log("Note off received "+channel+", "+pitch+", "+velocity);
}

//Upon receiving MIDI Control Change messzge
function ccEvent(channel, number, value)
{   
    //Is it encoder movement?
    if(channel==1 && number >= 16 && number <= 23){
        var index = number-16;
        //If SpinLeft
        if(value>64){
            //Subtract corrected value from potValue
            local.values.strips.getChild('Strip '+(index+1)).potVal.set(local.values.strips.getChild('Strip '+(index+1)).potVal.get()-((value-64)/256));
        }else{
            //Add value to potValue
            local.values.strips.getChild('Strip '+(index+1)).potVal.set(local.values.strips.getChild('Strip '+(index+1)).potVal.get()+(value/256));
        }
    }
}

//Upon receiving MIDI PitchWheel message (only fader values)
function pitchWheelEvent(channel,value){
    //Is Master fader?
    if(channel==9){
        local.values.main.mainFader.set(value/16383);
    }
    //It's a strip fader
    else{
        //Update strip module with new value
        local.values.strips.getChild('Strip '+channel).fader.set(value/16383);
    }
}

//Upon receiving System Exclusive Message
function sysExEvent(data)
{
    //script.log("Sysex Message received, "+data.length+" bytes :");
}
