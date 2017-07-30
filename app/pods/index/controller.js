import Ember from 'ember';
import * as speechSdk from 'Speech.Browser.Sdk';

const {
  computed,
  inject
} = Ember;

export default Ember.Controller.extend({
  session: inject.service('session'),
  vsts: inject.service('vsts'),

  isRecording: false,
  hypothesis: '',
  recognizer: null,

  lastWorkItem: null,

  lastWorkItemUrl: computed('lastWorkItem', function () {
    const lastWorkItem = this.get('lastWorkItem')
    return lastWorkItem ? `https://${lastWorkItem.account}.visualstudio.com/${lastWorkItem.fields['System.AreaPath']}/_workitems?id=${lastWorkItem.id}` : ''
  }),


  init() {
    this._super()
    const recognizer = this.setupRecognizer(
      speechSdk,
      speechSdk.RecognitionMode.Interactive,
      "en-US",
      speechSdk.SpeechResultFormat["Simple"])

    this.set('recognizer', recognizer)
  },

  setupRecognizer(SDK, recognitionMode, language, format) {
    var recognizerConfig = new SDK.RecognizerConfig(
      new SDK.SpeechConfig(
        new SDK.Context(
          new SDK.OS(navigator.userAgent, "Browser", null),
          new SDK.Device("VSTS-Speech-to-Task", "VSTS-Speech-to-Task", "1.0.00000"))),
      recognitionMode,    // SDK.RecognitionMode.Interactive  (Options - Interactive/Conversation/Dictation>)
      language,           // Supported laguages are specific to each recognition mode. Refer to docs.
      format);            // SDK.SpeechResultFormat.Simple (Options - Simple/Detailed)

    // Alternatively use  for token auth
    const fetchCallback = () => {
      const tokenDeferred = new SDK.Deferred()
      this.acquireCognitiveServicesToken()
          .then(token => tokenDeferred.Resolve(token))
      return tokenDeferred.promise
    }

    const fetchOnExpiryCallback = fetchCallback

    var authentication = new SDK.CognitiveTokenAuthentication(fetchCallback, fetchOnExpiryCallback);

    return SDK.CreateRecognizer(recognizerConfig, authentication);
  },

  acquireCognitiveServicesToken() {
    return fetch(`https://vsts-speech-to-task-service.azurewebsites.net/cognitiveservicestoken`, { method: 'POST' })
          .then(r => {
            return r.json()
              .then(json => {
                if (!r.ok) {
                  throw new Error(json.message || json.ErrorDescription || JSON.stringify(json))
                }

                return json
              })
          })
          .then(json => json.token)
  },

  updateRecognizedHypothesis(hypothesis) {
    this.set('hypothesis', hypothesis)
  },

  updateRecognizedPhrase(phrase) {
    console.log(phrase)
    this.set('hypothesis', phrase)
  },

  onSpeechEndDetected() {
    this.set('isRecording', false)
  },

  onComplete() {
    this.set('isRecording', false)
  },

  startRecording() {
    console.log('start recording')
    
    this.set('isRecording', true)
    const recognizer = this.get('recognizer')
    recognizer.Recognize((event) => {
      /*
       Alternative syntax for typescript devs.
       if (event instanceof SDK.RecognitionTriggeredEvent)
      */
      switch (event.Name) {
        case "RecognitionTriggeredEvent":
          // this.updateStatus("Initializing");
          break;
        case "ListeningStartedEvent":
          // this.updateStatus("Listening");
          break;
        case "RecognitionStartedEvent":
          // this.updateStatus("Listening_Recognizing");
          break;
        case "SpeechStartDetectedEvent":
          // this.updateStatus("Listening_DetectedSpeech_Recognizing");
          break;
        case "SpeechHypothesisEvent":
          this.updateRecognizedHypothesis(event.Result.Text);
          break;
        case "SpeechEndDetectedEvent":
          this.onSpeechEndDetected();
          break;
        case "SpeechSimplePhraseEvent":
          this.updateRecognizedPhrase(event.Result.DisplayText);
          break;
        case "SpeechDetailedPhraseEvent":
          this.updateRecognizedPhrase(event.Result.DisplayText);
          break;
        case "RecognitionEndedEvent":
          this.onComplete();
          console.log(JSON.stringify(event)); // Debug information
          break;
      }
    })
      .On(() => {
        // The request succeeded. Nothing to do here.
      },
      (error) => {
        console.error(error);
        this.stopRecording();
      });
  },

  stopRecording() {
    const recognizer = this.get('recognizer')
    recognizer.AudioSource.TurnOff();
    this.onComplete();
  },

  actions: {
    record() {
      const isRecording = this.get('isRecording')

      if (isRecording) {
        this.stopRecording()
      }
      else {
        this.startRecording()
      }
    },

    confirm() {
      const vsts = this.get('vsts')

      const newItem = {
        title: this.get('hypothesis'),
        description: this.get('hypothesis')
      }

      vsts.createWorkItem(newItem)
        .then(workItem => {
          workItem.account = this.get('vsts.account.accountName')
          this.set('hypothesis', '')
          this.set('lastWorkItem', workItem)
        })
    },

    dismiss() {
      this.set('lastWorkItem', null)
    }
  }
});
