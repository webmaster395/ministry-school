import styles from "./preview.module.css";

const fruits = ["Amour", "Joie", "Paix", "Patience", "Bonté", "Bienveillance", "Fidélité", "Douceur", "Maîtrise de soi"];

export default function FruitEspritPreview() {
  return <main className={styles.canvas}>
    <header className={styles.previewHeader}>
      <div><p>PROPOSITION VISUELLE</p><h1>Le jardin intérieur</h1></div>
      <span>Fruit de l’Esprit · aperçu non publié</span>
    </header>

    <section className={styles.grid}>
      <article className={`${styles.screen} ${styles.cover}`}>
        <div className={styles.brand}>MINISTRY SCHOOL <i /></div>
        <div className={styles.coverCopy}>
          <p>UN CHEMIN DE CROISSANCE</p>
          <h2>LE FRUIT<br />DE L’ESPRIT.</h2>
          <div className={styles.rule} />
          <p className={styles.lead}>Découvre ce qui grandit déjà dans ta vie et ce que tu peux encore laisser mûrir.</p>
        </div>
        <button>Commencer mon parcours <span>→</span></button>
      </article>

      <article className={`${styles.screen} ${styles.intro}`}>
        <div className={styles.eyebrow}>01 — DÉCOUVRIR</div>
        <h2>UN FRUIT.<br />NEUF EXPRESSIONS.</h2>
        <p>Le caractère de Jésus prend forme en nous, un pas après l’autre.</p>
        <div className={styles.words}>{fruits.map((fruit, index) => <span key={fruit}><b>{String(index + 1).padStart(2, "0")}</b>{fruit}</span>)}</div>
        <button>Continuer <span>→</span></button>
      </article>

      <article className={`${styles.screen} ${styles.question}`}>
        <div className={styles.progress}><span>03 / 09</span><i><b /></i></div>
        <div className={styles.questionCopy}>
          <p>TON PARCOURS · PAIX</p>
          <h2>Quand une situation t’inquiète, arrives-tu à retrouver le calme et à faire confiance à Dieu&nbsp;?</h2>
        </div>
        <div className={styles.scale}>{[[1,"Très peu"],[2,"Un peu"],[3,"Parfois"],[4,"Souvent"],[5,"Beaucoup"]].map(([n,label]) => <button key={n}><b>{n}</b><span>{label}</span></button>)}</div>
        <p className={styles.help}>Choisis ce qui te ressemble aujourd’hui. Il n’y a pas de bonne ou de mauvaise réponse.</p>
        <div className={styles.nav}><span>← Retour</span><button>→</button></div>
      </article>

      <article className={`${styles.screen} ${styles.result}`}>
        <div className={styles.eyebrow}>TON JARDIN AUJOURD’HUI</div>
        <h2>CE QUI<br />GRANDIT<br />EN TOI.</h2>
        <p>Ton parcours met en lumière ce qui porte déjà du fruit et ce qui peut encore grandir.</p>
        <div className={styles.resultBlocks}>
          <button><b>04</b><span><strong>Ce qui porte déjà du fruit</strong>Découvrir tes forces d’aujourd’hui</span>→</button>
          <button><b>03</b><span><strong>Ce qui est en train de grandir</strong>Voir tes prochaines étapes</span>→</button>
          <button><b>02</b><span><strong>Ce qui demande de l’attention</strong>Avancer avec douceur</span>→</button>
        </div>
      </article>
    </section>
  </main>;
}
