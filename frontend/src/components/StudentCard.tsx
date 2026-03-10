interface StudentData {
  id: string;
  personProfil: {
    navn: {
      fornavn: string;
      etternavn: string;
    };
    privatEpost: string;
  };
}

interface Props {
  student: StudentData;
}

export default function StudentCard({ student }: Props) {
  const { navn } = student.personProfil;

  return (
    <div className="student-card">
      <h2>
        {navn.fornavn} {navn.etternavn}
      </h2>
      <p><strong>ID:</strong> {student.id}</p>
      <p><strong>Privat e-post:</strong> {student.personProfil.privatEpost}</p>
    </div>
  );
}