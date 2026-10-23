# Xat en català

A chat that replies in Catalan whatever language the user writes in, to help people learn the language.

## Language

**Message**:
A text the user enters into the chat.
_Avoid_: Question, prompt, user chat

**Reply**:
The text the model writes in answer to a message.
_Avoid_: Response, answer

**Translation**:
A reply that renders a message in Catalan as entered, instead of answering it.

**Exchange**:
One message together with the reply to it.
_Avoid_: Pair, question/response pair, turn

**Saved exchange**:
An exchange the user has chosen to keep, so that it outlives the conversation it came from. It is kept on the user's device only.
_Avoid_: Saved pair, saved phrase, bookmark, favourite

**Offer**:
What a reply shows under it once the user opens it: to hear the reply spoken, and to keep its exchange as a saved exchange. One reply's offer is open at a time.
_Avoid_: Menu, actions, toolbar

**Learner profile**:
What the app knows about the user as a learner: their native language and their level. It shapes every reply but a translation. It is kept on the user's device only.
_Avoid_: Settings, preferences, account, user profile

**Native language**:
The language, chosen from a fixed list, that the user reads best, used to explain Catalan to them while their level is low.
_Avoid_: Mother tongue, first language, UI language

**Level**:
How well the user knows Catalan, on the CEFR scale from A1 to C2, as they judge it themselves.
_Avoid_: Proficiency, skill, grade

**Onboarding**:
The steps on a first visit that fill in the learner profile before the session starts.
_Avoid_: Setup, sign-up, welcome flow

**Conversation**:
The messages and replies exchanged since the user last started afresh.
_Avoid_: Thread, history

**Session**:
The period from the model being woken on page load until the page is closed.

**Cold start**:
The wait from a message reaching the model while nothing is running to serve it until the first word of the reply.
_Avoid_: Warm-up, boot time, spin-up

**Model host**:
A service that runs the model and answers the chat's requests to it.
_Avoid_: Endpoint, backend, provider, inference server
