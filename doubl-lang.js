/*      doubl.lang      */
// a corru.observer mod for viewing english dialogues with their localized counterparts in-game simultaneously
// by @dutokrisa (discord). contact it for any bug-fixes or questions



document.head.appendChild(document.createElement('style').appendChild(document.createTextNode(`.doubllang {left:0!important;}`)).parentElement)

document.head.appendChild(document.createElement('div').setAttributeNode.)

document.head.appendChild(document.createElement('div')).setAttribute("id", "dialogue-box").setAttribute("class", "menu-box menu doubllang").setAttribute("menu","dialogue")


function startDialogue(dialogueChain, settings = {originEntityID: null, specificChain: false}) {
    if(body.classList.contains('in-dialogue')  || env.currentDialogue.active || !env.currentDialogue.canStart || check("TEMP!!nodialogue")){
        env.error = `tried to start dialogue ${dialogueChain} but either currently in dialogue or too soon after previous dialogue. consider using CHANGE::`
        return 
    }
    if(body.classList.contains('mui-active') || body.getAttribute("menu") != "none") exitMenu()
    
    //if origin entity is set, we keep track of that entity and also highlight it somehow (usually for dynamic purposes related)
    if(settings.originEntityID) {
        env.currentDialogue.originEntityID = `#${settings.originEntityID}`
        document.querySelectorAll(`#realgrid ${settings.originEntityID}, #grid-ref ${settings.originEntityID}`).forEach(el=>{
            el.classList.add('dialogue-origin')
        })
    } else env.currentDialogue.originEntityID = null
    
    body.classList.add('in-dialogue', 'in-menu')
    env.currentDialogue.canStart = false

    if(!env.currentDialogue.active) { //if dialogue isn't active already, start the dialogue
        setTimeout(()=>{
            body.setAttribute('currentDialogue', dialogueChain)
            document.getElementById('dialogue-box').classList.toggle("can-skip", env.currentDialogue.chain?.skip ? true : false)
        }, stageAngleReset()) //stageAngleReset is a timing and camera movement function from cystStage that helps make sure things are timed right

        const localization = getLocalizationForPage()
        if(localization.dialogues) env.currentDialogue.chain = localization.dialogues[`${page.dialoguePrefix}__${dialogueChain}`] || localization.dialogues[dialogueChain] || env.dialogues[dialogueChain]
        else env.currentDialogue.chain = env.dialogues[dialogueChain]
        
        env.currentDialogue.chainName = dialogueChain
        try {
            sendDialogue(typeof settings?.specificChain == "undefined" || settings?.specificChain === false ? env.currentDialogue.chain.start : env.currentDialogue.chain[settings?.specificChain])
        } catch(e) { printError(`dialogue error for ${dialogueChain}: ` + e, true); setTimeout(()=>endDialogue(), 2000)}
        env.currentDialogue.active = true

        //identify actors and add them as objects within the currentDialogue object for ease of use
        env.currentDialogue.actors = {}
        for (const topicName in env.currentDialogue.chain) {
            //ignore some special strings
            if(!["end", "skip", "skipTime", "skipNotice"].includes(topicName)) {
                env.currentDialogue.chain[topicName].body.forEach(dialogue => {
                    env.currentDialogue.actors[dialogue.actor] = getDialogueActor(dialogue.actor, true)
                })
            }
        }
    }
}
