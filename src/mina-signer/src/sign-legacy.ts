import { UInt32, UInt64 } from '../../provable/field-bigint.js';
import { PrivateKey, PublicKey } from '../../provable/curve-bigint.js';
import { HashInputLegacy } from '../../provable/poseidon-bigint.js';
import { Memo } from './memo.js';
import {
  SignatureJson,
  NetworkId,
  Signature,
  signLegacy,
  verifyLegacy,
} from './signature.js';
import { Json } from '../../provable/gen/transaction-bigint.js';
import { bytesToBits, stringToBytes } from '../../provable/binable.js';

export {
  signPayment,
  signStakeDelegation,
  signString,
  verifyPayment,
  verifyStakeDelegation,
  verifyStringSignature,
  paymentFromJson,
  delegationFromJson,
  commonFromJson,
  PaymentJson,
  DelegationJson,
  CommonJson,
  Tag,
  UserCommand,
  UserCommandEnum,
  BodyEnum,
  Payment,
  Delegation,
  Common,
};

function signPayment(
  payment: PaymentJson,
  privateKeyBase58: string,
  networkId: NetworkId
) {
  let command = paymentFromJson(payment);
  return signUserCommand(command, privateKeyBase58, networkId);
}
function signStakeDelegation(
  delegation: DelegationJson,
  privateKeyBase58: string,
  networkId: NetworkId
) {
  let command = delegationFromJson(delegation);
  return signUserCommand(command, privateKeyBase58, networkId);
}

function signUserCommand(
  command: UserCommand,
  privateKeyBase58: string,
  networkId: NetworkId
) {
  let input = toInputLegacy(command);
  let privateKey = PrivateKey.fromBase58(privateKeyBase58);
  let signature = signLegacy(input, privateKey, networkId);
  return Signature.toJSON(signature);
}

function verifyPayment(
  payment: PaymentJson,
  signatureJson: SignatureJson,
  publicKeyBase58: string,
  networkId: NetworkId
) {
  try {
    return verifyUserCommand(
      paymentFromJson(payment),
      signatureJson,
      publicKeyBase58,
      networkId
    );
  } catch {
    return false;
  }
}
function verifyStakeDelegation(
  delegation: DelegationJson,
  signatureJson: SignatureJson,
  publicKeyBase58: string,
  networkId: NetworkId
) {
  try {
    return verifyUserCommand(
      delegationFromJson(delegation),
      signatureJson,
      publicKeyBase58,
      networkId
    );
  } catch {
    return false;
  }
}

function verifyUserCommand(
  command: UserCommand,
  signatureJson: SignatureJson,
  publicKeyBase58: string,
  networkId: NetworkId
) {
  let input = toInputLegacy(command);
  let signature = Signature.fromJSON(signatureJson);
  let publicKey = PublicKey.fromBase58(publicKeyBase58);
  return verifyLegacy(signature, input, publicKey, networkId);
}

function toInputLegacy({ common, body }: UserCommand) {
  return HashInputLegacy.append(
    commonToInputLegacy(common),
    bodyToInputLegacy(body)
  );
}

// Mina_base.Transaction_union_payload.Body.to_input_legacy
function bodyToInputLegacy({
  tag,
  source,
  receiver,
  amount,
}: UserCommand['body']) {
  return [
    tagToInput(tag),
    PublicKey.toInputLegacy(source),
    PublicKey.toInputLegacy(receiver),
    HashInputLegacy.bits(legacyTokenId),
    HashInputLegacy.bits(UInt64.toBits(amount)),
    HashInputLegacy.bits([false]), // token_locked
  ].reduce(HashInputLegacy.append);
}

// Mina_base.Signed_command_payload.Common.to_input_legacy
function commonToInputLegacy({
  fee,
  feePayer,
  nonce,
  validUntil,
  memo,
}: UserCommand['common']) {
  return [
    HashInputLegacy.bits(UInt64.toBits(fee)),
    HashInputLegacy.bits(legacyTokenId),
    PublicKey.toInputLegacy(feePayer),
    HashInputLegacy.bits(UInt32.toBits(nonce)),
    HashInputLegacy.bits(UInt32.toBits(validUntil)),
    HashInputLegacy.bits(Memo.toBits(memo)),
  ].reduce(HashInputLegacy.append);
}

function tagToInput(tag: Tag) {
  let int = { Payment: 0, StakeDelegation: 1 }[tag];
  let bits = [int & 4, int & 2, int & 1].map(Boolean);
  return HashInputLegacy.bits(bits);
}
const legacyTokenId = [true, ...Array<boolean>(63).fill(false)];

function paymentFromJson({
  common,
  body: { source, receiver, amount },
}: PaymentJson): UserCommand {
  return {
    common: commonFromJson(common),
    body: {
      tag: 'Payment',
      source: PublicKey.fromJSON(source),
      receiver: PublicKey.fromJSON(receiver),
      amount: UInt64.fromJSON(amount),
    },
  };
}

function delegationFromJson({
  common,
  body: { delegator, newDelegate },
}: DelegationJson): UserCommand {
  return {
    common: commonFromJson(common),
    body: {
      tag: 'StakeDelegation',
      source: PublicKey.fromJSON(delegator),
      receiver: PublicKey.fromJSON(newDelegate),
      amount: UInt64(0),
    },
  };
}

function commonFromJson(c: CommonJson) {
  return {
    fee: UInt64.fromJSON(c.fee),
    feePayer: PublicKey.fromJSON(c.feePayer),
    nonce: UInt32.fromJSON(c.nonce),
    validUntil: UInt32.fromJSON(c.validUntil),
    // TODO: this might need to be fromBase58
    memo: Memo.fromString(c.memo),
  };
}

function signString(
  string: string,
  privateKeyBase58: string,
  networkId: NetworkId
) {
  let input = stringToInput(string);
  let privateKey = PrivateKey.fromBase58(privateKeyBase58);
  let signature = signLegacy(input, privateKey, networkId);
  return Signature.toJSON(signature);
}
function verifyStringSignature(
  string: string,
  signatureJson: SignatureJson,
  publicKeyBase58: string,
  networkId: NetworkId
) {
  try {
    let input = stringToInput(string);
    let signature = Signature.fromJSON(signatureJson);
    let publicKey = PublicKey.fromBase58(publicKeyBase58);
    return verifyLegacy(signature, input, publicKey, networkId);
  } catch {
    return false;
  }
}

function stringToInput(string: string) {
  let bits = stringToBytes(string)
    .map((byte) => bytesToBits([byte]).reverse())
    .flat();
  return HashInputLegacy.bits(bits);
}

// types

type Tag = 'Payment' | 'StakeDelegation';

type UserCommand = {
  common: Common;
  body: {
    tag: Tag;
    source: PublicKey;
    receiver: PublicKey;
    amount: UInt64;
  };
};

type UserCommandEnum = {
  common: Common;
  body: BodyEnum;
};

type BodyEnum =
  | { type: 'Payment'; value: Payment }
  | {
      type: 'StakeDelegation';
      value: { type: 'SetDelegate'; value: Delegation };
    };

type Common = {
  fee: UInt64;
  feePayer: PublicKey;
  nonce: UInt32;
  validUntil: UInt32;
  memo: string;
};

type Payment = {
  source: PublicKey;
  receiver: PublicKey;
  amount: UInt64;
};
type Delegation = {
  delegator: PublicKey;
  newDelegate: PublicKey;
};

type CommonJson = {
  fee: Json.UInt64;
  feePayer: Json.PublicKey;
  nonce: Json.UInt32;
  validUntil: Json.UInt32;
  memo: string;
};

type PaymentJson = {
  common: CommonJson;
  body: {
    source: Json.PublicKey;
    receiver: Json.PublicKey;
    amount: Json.UInt64;
  };
};

type DelegationJson = {
  common: CommonJson;
  body: {
    delegator: Json.PublicKey;
    newDelegate: Json.PublicKey;
  };
};
